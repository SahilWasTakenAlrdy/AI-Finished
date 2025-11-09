


export type GeminiModel = 'gemini-2.5-pro' | 'gemini-2.5-flash';
export type ImageGenerationModel = 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image';

export enum Role {
    User = 'user',
    Model = 'model',
}

export type Content = string;

export interface Attachment {
    type: 'image' | 'video';
    data: string; // base64 encoded
    mimeType: string;
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface Message {
    id: string;
    role: Role;
    content: Content;
    attachments?: Attachment[];
    timestamp: string;
    isLoading?: boolean;
    isError?: boolean;
    groundingSources?: GroundingSource[];
    youtubeLink?: string;
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: string;
}

export interface Tone {
    id: string;
    name: string;
    instruction: string;
    isCustom?: boolean;
}

export interface Settings {
    selectedToneId: string;
    customTones: Tone[];
    memory?: string;
    outputLength: 'auto' | 'short' | 'medium' | 'long';
}

export type SpecialMode = 'deep_thinking' | 'google_search' | 'google_maps' | 'image_generation' | 'image_editing' | 'coding' | 'deep_research';