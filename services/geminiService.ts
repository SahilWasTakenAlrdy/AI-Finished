
import { GoogleGenAI, GenerateContentResponse, Part, FunctionDeclaration, Type, Modality } from "@google/genai";
import { Message, Settings, Role, SpecialMode, ImageGenerationModel, GroundingSource, Tone } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const DEFAULT_TONES: Tone[] = [
    { id: 'casual', name: 'Casual', instruction: 'You are a casual and easy-going AI assistant. Your tone is relaxed, informal, and conversational.' },
    { id: 'friend', name: 'The Friend', instruction: 'You are not just an AI, but a friend. You are supportive and chill, but also have a personality. You can be playfully sarcastic, crack jokes, and aren\'t afraid to give a little tough love or a reality check when needed. You match the user\'s vibe.' },
    { id: 'expert', name: 'Expert', instruction: 'You are an expert AI assistant. Your responses should be knowledgeable, detailed, well-structured, and authoritative. You break down complex topics clearly and provide in-depth explanations.' },
];

const updateMemoryFunctionDeclaration: FunctionDeclaration = {
  name: 'update_user_memory',
  description: 'Adds new information to the notes about the user. Use this to remember user preferences, name, birthday, or other important details shared by the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      information_to_add: {
        type: Type.STRING,
        description: 'A concise piece of information to add to the user\'s memory notes. For example: "User\'s name is Alex" or "Likes dogs".'
      },
    },
    required: ['information_to_add']
  }
};

function getSystemInstruction(settings: Settings): string {
    const allTones = [...DEFAULT_TONES, ...settings.customTones];
    const selectedTone = allTones.find(t => t.id === settings.selectedToneId);
    
    let instruction = selectedTone ? selectedTone.instruction : 'You are a helpful AI assistant.';

    instruction += `\n\nYou have a memory function available to remember key details about the user for a more personalized experience. Be proactive and intelligent in using it.
- WHAT TO REMEMBER: Specific facts about the user (name, location, profession), their preferences (likes/dislikes), important conversation details for later, and their goals.
- HOW TO REMEMBER: When you identify a piece of information worth remembering, use the 'update_user_memory' tool with a concise, factual note.`;

    if (settings.outputLength && settings.outputLength !== 'auto') {
        instruction += `\n\n--- Output Length Preference ---`;
        if (settings.outputLength === 'short') {
            instruction += `\nAlways keep your responses short and to the point.`;
        } else if (settings.outputLength === 'medium') {
            instruction += `\nProvide reasonably detailed responses, but don't be overly verbose.`;
        } else if (settings.outputLength === 'long') {
            instruction += `\nProvide comprehensive, in-depth, and detailed responses.`;
        }
    }

    if (settings.memory) {
        instruction += `\n\n--- User Preferences & Memory ---\nHere is some information about the user you are talking to. Use this to personalize your conversation:\n${settings.memory}\n---------------------------------`;
    }

    return instruction;
}

function extractGroundingSources(response: GenerateContentResponse): GroundingSource[] | undefined {
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (!groundingMetadata?.groundingChunks) {
        return undefined;
    }

    const sources: GroundingSource[] = [];
    for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web) {
            sources.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
        } else if (chunk.maps) {
            sources.push({ uri: chunk.maps.uri, title: chunk.maps.title || 'View on Google Maps' });
        }
    }
    return sources.length > 0 ? sources : undefined;
}

export const generateChatResponse = async (
    userMessage: Message,
    settings: Settings,
    specialMode: SpecialMode | null,
    location: { latitude: number; longitude: number; } | undefined,
    onStream: (chunk: string) => void
): Promise<{ groundingSources?: GroundingSource[], functionCalls?: any[] }> => {
    
    const youtubeUrlRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/|)([\w-]{11})/;
    const hasYoutubeLink = youtubeUrlRegex.test(userMessage.content as string);

    const parts: Part[] = [{ text: userMessage.content }];

    if (userMessage.attachments) {
        for (const attachment of userMessage.attachments) {
            parts.push({
                inlineData: {
                    mimeType: attachment.mimeType,
                    data: attachment.data
                }
            });
            if (attachment.type === 'video') {
                 parts.push({ text: "\n(Note: The above is the first frame of an uploaded video. Analyze it as a static image and describe what might be happening.)"});
            }
        }
    }

    const systemInstruction = getSystemInstruction(settings);
    let effectiveModel: 'gemini-2.5-pro' | 'gemini-2.5-flash' = 'gemini-2.5-flash';
    let requestConfig: any = {};

    if (hasYoutubeLink) {
        effectiveModel = 'gemini-2.5-pro';
        requestConfig.tools = [{ googleSearch: {} }];
    } else if (specialMode === 'deep_thinking') {
        effectiveModel = 'gemini-2.5-pro';
        requestConfig.thinkingConfig = { thinkingBudget: 32768 };
        requestConfig.tools = [{ functionDeclarations: [updateMemoryFunctionDeclaration] }];
    } else if (specialMode === 'coding') {
        effectiveModel = 'gemini-2.5-pro';
        requestConfig.tools = [{ functionDeclarations: [updateMemoryFunctionDeclaration] }];
    } else if (specialMode === 'google_maps') {
        requestConfig.tools = [{ googleMaps: {} }];
        if (location) {
             requestConfig.toolConfig = {
                retrievalConfig: {
                    latLng: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                    }
                }
            }
        }
    } else if (specialMode === 'deep_research') {
        effectiveModel = 'gemini-2.5-pro';
        requestConfig.tools = [{ googleSearch: {} }];
    } else if (specialMode === 'google_search') {
         requestConfig.tools = [{ googleSearch: {} }];
    }
    else {
        // Default mode: AI uses memory for personalization.
        // Web search is available via special modes.
        requestConfig.tools = [{ functionDeclarations: [updateMemoryFunctionDeclaration] }];
    }

    try {
        const stream = await ai.models.generateContentStream({
            model: effectiveModel,
            contents: { parts },
            config: {
                systemInstruction,
                ...requestConfig
            }
        });

        let finalResponse: GenerateContentResponse | null = null;
        let aggregatedFunctionCalls: any[] = [];

        for await (const chunk of stream) {
            onStream(chunk.text ?? '');
            if (chunk.functionCalls) {
                 aggregatedFunctionCalls.push(...chunk.functionCalls);
            }
            finalResponse = chunk;
        }

        const groundingSources = finalResponse ? extractGroundingSources(finalResponse) : undefined;

        return { 
            groundingSources, 
            functionCalls: aggregatedFunctionCalls.length > 0 ? aggregatedFunctionCalls : undefined 
        };

    } catch(e) {
        console.error("Gemini API Error:", e);
        throw new Error(`Failed to get response from Gemini. ${e instanceof Error ? e.message : ''}`);
    }
};

export const generateImage = async (
    prompt: string, 
    options: { aspectRatio: string, model: ImageGenerationModel }
): Promise<{ base64: string }> => {
    try {
        if (options.model === 'imagen-4.0-generate-001') {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png',
                    aspectRatio: options.aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
                },
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
                return { base64: response.generatedImages[0].image.imageBytes };
            }
        } else if (options.model === 'gemini-2.5-flash-image') {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return { base64: part.inlineData.data };
                }
            }
        }
        
        throw new Error("Image generation failed, no images returned.");

    } catch (e) {
        console.error("Image Generation API Error:", e);
        throw new Error(`Failed to generate image. ${e instanceof Error ? e.message : ''}`);
    }
};

export const editImage = async (
    base64ImageData: string, 
    mimeType: string,
    prompt: string
): Promise<{ base64: string }> => {
    try {
        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType: mimeType,
            },
        };
        const textPart = {
            text: prompt,
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return { base64: part.inlineData.data };
            }
        }
        
        throw new Error("Image editing failed, no image returned in response.");
    } catch (e) {
        console.error("Image Editing API Error:", e);
        throw new Error(`Failed to edit image. ${e instanceof Error ? e.message : ''}`);
    }
};

export const summarizeConversation = async (messages: Message[]): Promise<string> => {
    if (messages.length === 0) return "New Conversation";

    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const prompt = `Summarize the following conversation into a short, concise title (5 words or less):\n\n${conversationText}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim().replace(/["']/g, ""); // Clean up quotes
    } catch (e) {
        console.error("Summarization Error:", e);
        return "Untitled Chat";
    }
};