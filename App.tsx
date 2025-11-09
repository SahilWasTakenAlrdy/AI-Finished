



import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { SettingsModal } from './components/SettingsModal';
import { 
    Conversation, 
    Message, 
    Settings, 
    Role, 
    Content, 
    Attachment, 
    SpecialMode, 
    ImageGenerationModel
} from './types';
import { generateChatResponse, generateImage, summarizeConversation, editImage } from './services/geminiService';
import { useGeolocation } from './hooks/useGeolocation';
import { MenuIcon } from './components/icons/MenuIcon';
import { CodeWorkspace } from './components/CodeWorkspace';

const App: React.FC = () => {
    const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
    const [conversationOrder, setConversationOrder] = useState<string[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [settings, setSettings] = useState<Settings>({ selectedToneId: 'casual', customTones: [], memory: '', outputLength: 'auto' });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [workspaceCode, setWorkspaceCode] = useState<{ code: string; language: string; } | null>(null);


    const { location, error: locationError } = useGeolocation();

    useEffect(() => {
        // Load conversations from local storage on initial render
        try {
            const savedConversations = localStorage.getItem('conversations');
            const savedOrder = localStorage.getItem('conversationOrder');
            const savedSettings = localStorage.getItem('gemini-settings');

            if (savedConversations && savedOrder) {
                setConversations(new Map(JSON.parse(savedConversations) as [string, Conversation][]));
                setConversationOrder(JSON.parse(savedOrder));
            }
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                // Ensure settings have the new shape, provide defaults if not
                setSettings({
                    selectedToneId: parsedSettings.selectedToneId || 'casual',
                    customTones: parsedSettings.customTones || [],
                    memory: parsedSettings.memory || '',
                    outputLength: parsedSettings.outputLength || 'auto',
                });
            }
        } catch (error) {
            console.error("Failed to load data from local storage:", error);
        }
    }, []);

    useEffect(() => {
        // Save conversations to local storage whenever they change
        try {
            localStorage.setItem('conversations', JSON.stringify(Array.from(conversations.entries())));
            localStorage.setItem('conversationOrder', JSON.stringify(conversationOrder));
        } catch (error) {
            console.error("Failed to save conversations to local storage:", error);
        }
    }, [conversations, conversationOrder]);

    useEffect(() => {
        // Save settings to local storage whenever they change
        try {
            localStorage.setItem('gemini-settings', JSON.stringify(settings));
        } catch (error) {
            console.error("Failed to save settings to local storage:", error);
        }
    }, [settings]);

    const activeConversation = useMemo(() => {
        if (!activeConversationId) return null;
        return conversations.get(activeConversationId) || null;
    }, [activeConversationId, conversations]);

    const renameConversation = useCallback((id: string, newTitle: string) => {
        setConversations((prev: Map<string, Conversation>) => {
            const newMap = new Map(prev);
            const conv = newMap.get(id);
            if (conv) {
                const updatedConv = { ...conv, title: newTitle };
                newMap.set(id, updatedConv);
            }
            return newMap;
        });
    }, []);

    useEffect(() => {
        if (activeConversation && activeConversation.title === 'New Conversation' && activeConversation.messages.length >= 2) {
             const lastMessage = activeConversation.messages[activeConversation.messages.length - 1];
            if (lastMessage.role === Role.Model && !lastMessage.isLoading && !lastMessage.isError) {
                summarizeConversation(activeConversation.messages).then(summary => {
                    if (summary) {
                        renameConversation(activeConversation.id, summary);
                    }
                });
            }
        }
    }, [activeConversation, renameConversation]);

    const createNewConversation = useCallback(() => {
        const newId = `conv_${Date.now()}`;
        const newConversation: Conversation = {
            id: newId,
            title: 'New Conversation',
            messages: [],
            createdAt: new Date().toISOString(),
        };
        setConversations(prev => new Map(prev).set(newId, newConversation));
        setConversationOrder(prev => [newId, ...prev]);
        setActiveConversationId(newId);
    }, []);
    
    const selectConversation = useCallback((id: string) => {
        setActiveConversationId(id);
    }, []);

    const deleteConversation = useCallback((id: string) => {
        setConversations((prev: Map<string, Conversation>) => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
        });
        setConversationOrder(prev => prev.filter(convId => convId !== id));
        if (activeConversationId === id) {
            const newActiveId = conversationOrder.filter(convId => convId !== id)[0] || null;
            setActiveConversationId(newActiveId);
        }
    }, [activeConversationId, conversationOrder]);

    const handleOpenWorkspace = useCallback((code: string, language: string) => {
        setWorkspaceCode({ code, language });
        setIsSidebarOpen(false);
    }, []);

    const handleCloseWorkspace = useCallback(() => {
        setWorkspaceCode(null);
        setIsSidebarOpen(true);
    }, []);

    const handleSendMessage = useCallback(async (
        content: Content, 
        attachments: Attachment[], 
        specialMode: SpecialMode | null, 
        imageOptions?: { aspectRatio: string; model: ImageGenerationModel },
        youtubeLink?: string
    ) => {
        let currentConvId = activeConversationId;

        if (!currentConvId) {
            const newId = `conv_${Date.now()}`;
            const newConversation: Conversation = {
                id: newId,
                title: 'New Conversation',
                messages: [],
                createdAt: new Date().toISOString(),
            };
            setConversations((prev: Map<string, Conversation>) => new Map(prev).set(newId, newConversation));
            setConversationOrder(prev => [newId, ...prev]);
            setActiveConversationId(newId);
            currentConvId = newId;
        }

        const userMessage: Message = {
            id: `msg_${Date.now()}`,
            role: Role.User,
            content,
            attachments,
            timestamp: new Date().toISOString(),
            youtubeLink
        };

        setConversations((prev: Map<string, Conversation>) => {
            const newConversations = new Map(prev);
            const conv = newConversations.get(currentConvId!);
            if (conv) {
                const updatedConv = { ...conv, messages: [...conv.messages, userMessage] };
                newConversations.set(currentConvId!, updatedConv);
            }
            return newConversations;
        });
        
        const modelMessage: Message = {
            id: `msg_${Date.now() + 1}`,
            role: Role.Model,
            content: '',
            isLoading: true,
            timestamp: new Date().toISOString(),
        };

        setConversations((prev: Map<string, Conversation>) => {
            const newConversations = new Map(prev);
            const conv = newConversations.get(currentConvId!);
            if (conv) {
                const updatedConv = { ...conv, messages: [...conv.messages, modelMessage] };
                newConversations.set(currentConvId!, updatedConv);
            }
            return newConversations;
        });
        
        try {
            const hasImageAttachment = attachments.some(a => a.type === 'image');
            const editKeywords = /\b(edit|change|add|remove|replace|make|turn|put|insert|color|style|background)\b/i;
            const isEditRequest = hasImageAttachment && editKeywords.test(content as string);

            if (specialMode === 'image_generation') {
                if (!imageOptions) throw new Error("Image generation options are missing.");
                const imageData = await generateImage(content as string, imageOptions);
                const imageResponse: Message = {
                    id: modelMessage.id,
                    role: Role.Model,
                    content: 'Here is the generated image:',
                    attachments: [{ type: 'image', data: imageData.base64, mimeType: 'image/png' }],
                    timestamp: new Date().toISOString(),
                };
                 setConversations((prev: Map<string, Conversation>) => {
                    const newConversations = new Map(prev);
                    const conv = newConversations.get(currentConvId!);
                    if (conv) {
                        const messageIndex = conv.messages.findIndex(m => m.id === modelMessage.id);
                        if (messageIndex !== -1) {
                            const newMessages = [...conv.messages];
                            newMessages[messageIndex] = imageResponse;
                            const updatedConv = { ...conv, messages: newMessages };
                            newConversations.set(currentConvId!, updatedConv);
                        }
                    }
                    return newConversations;
                });
            } else if (isEditRequest) {
                const originalImage = attachments.find(a => a.type === 'image');
                 if (!originalImage) {
                    throw new Error("An image must be provided to edit.");
                }
                const editedImageData = await editImage(originalImage.data, originalImage.mimeType, content as string);
                const imageResponse: Message = {
                    id: modelMessage.id,
                    role: Role.Model,
                    content: 'Here is the edited image:',
                    attachments: [{ type: 'image', data: editedImageData.base64, mimeType: 'image/png' }],
                    timestamp: new Date().toISOString(),
                };
                setConversations((prev: Map<string, Conversation>) => {
                    const newConversations = new Map(prev);
                    const conv = newConversations.get(currentConvId!);
                    if (conv) {
                        const messageIndex = conv.messages.findIndex(m => m.id === modelMessage.id);
                        if (messageIndex !== -1) {
                            const newMessages = [...conv.messages];
                            newMessages[messageIndex] = imageResponse;
                            const updatedConv = { ...conv, messages: newMessages };
                            newConversations.set(currentConvId!, updatedConv);
                        }
                    }
                    return newConversations;
                });
            } else {
                let apiContent = content;
                if (youtubeLink) {
                    const userQuestion = content.trim();
                    const baseInstruction = `You are an expert YouTube video analyst. Your task is to analyze the video at the provided URL. Use your search tools to find transcripts, summaries, or key information about this specific video.`;

                    if (userQuestion) {
                        apiContent = `${baseInstruction}\n\nA user has a specific question about the video at ${youtubeLink}. The question is: "${userQuestion}". Answer the question based on the video's content. If you cannot find specific information to answer the question, clearly state that you couldn't find the necessary details in the video's content online. Do not give a generic error about not being able to access links.`;
                    } else {
                        apiContent = `${baseInstruction}\n\nPlease provide a concise summary of the video found at ${youtubeLink}. If you cannot find a transcript or sufficient details, explain that your search did not return enough information for a summary, rather than saying you cannot access external links.`;
                    }
                }
                const messageForApi = { ...userMessage, content: apiContent };


                const onStream = (textChunk: string) => {
                    setConversations((prev: Map<string, Conversation>) => {
                        const newConversations = new Map(prev);
                        const conv = newConversations.get(currentConvId!);
                        if (conv && conv.messages.length > 0) {
                            const lastMessage = conv.messages[conv.messages.length - 1];
                            if (lastMessage.id === modelMessage.id && lastMessage.role === Role.Model) {
                                const updatedMessage = { ...lastMessage, content: lastMessage.content + textChunk, isLoading: true };
                                const newMessages = [...conv.messages.slice(0, -1), updatedMessage];
                                const updatedConv = { ...conv, messages: newMessages };
                                newConversations.set(currentConvId!, updatedConv);
                            }
                        }
                        return newConversations;
                    });
                };

                const { groundingSources, functionCalls } = await generateChatResponse(
                    messageForApi,
                    settings,
                    specialMode,
                    location ?? undefined,
                    onStream,
                );
                
                if (functionCalls) {
                    for (const fc of functionCalls) {
                        if (fc.name === 'update_user_memory') {
                            const { information_to_add } = fc.args;
                            if (information_to_add) {
                                setSettings(prev => ({
                                    ...prev,
                                    memory: (prev.memory ? `${prev.memory}\n- ${information_to_add}` : `- ${information_to_add}`)
                                }));
                            }
                        }
                    }
                }

                setConversations((prev: Map<string, Conversation>) => {
                    const newConversations = new Map(prev);
                    const conv = newConversations.get(currentConvId!);
                    if (conv && conv.messages.length > 0) {
                        let lastMessage = conv.messages[conv.messages.length - 1];
                        if (lastMessage.id === modelMessage.id && lastMessage.role === Role.Model) {
                             if (functionCalls && functionCalls.length > 0 && !lastMessage.content.trim()) {
                                lastMessage = { ...lastMessage, content: "Got it! I'll remember that." };
                            }
                            const updatedMessage = { ...lastMessage, isLoading: false, groundingSources };
                            const newMessages = [...conv.messages.slice(0, -1), updatedMessage];
                            const updatedConv = { ...conv, messages: newMessages };
                            newConversations.set(currentConvId!, updatedConv);
                        }
                    }
                    return newConversations;
                });
            }
        } catch (error) {
            console.error('Error generating response:', error);
            const errorMessage: Message = {
                id: modelMessage.id,
                role: Role.Model,
                content: `Sorry, something went wrong. ${error instanceof Error ? error.message : 'Please try again.'}`,
                isError: true,
                timestamp: new Date().toISOString(),
            };
            setConversations((prev: Map<string, Conversation>) => {
                const newConversations = new Map(prev);
                const conv = newConversations.get(currentConvId!);
                if (conv) {
                    const messageIndex = conv.messages.findIndex(m => m.id === modelMessage.id);
                    if (messageIndex !== -1) {
                        const newMessages = [...conv.messages];
                        newMessages[messageIndex] = errorMessage;
                        const updatedConv = { ...conv, messages: newMessages };
                        newConversations.set(currentConvId!, updatedConv);
                    }
                }
                return newConversations;
            });
        }
    }, [activeConversationId, conversations, settings, location]);

    return (
        <div className="flex h-screen w-screen bg-background text-text-primary font-sans overflow-hidden">
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                setSettings={setSettings}
            />
            <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64 md:w-80' : 'w-0'} flex-shrink-0`}>
                <Sidebar
                    conversations={Array.from(conversations.values()).sort((a: Conversation, b: Conversation) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
                    activeConversationId={activeConversationId}
                    onSelectConversation={selectConversation}
                    onNewConversation={createNewConversation}
                    onDeleteConversation={deleteConversation}
                    onRenameConversation={renameConversation}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    isOpen={isSidebarOpen}
                />
            </div>
            <main className="flex-1 flex flex-col relative bg-background">
                {workspaceCode ? (
                    <CodeWorkspace
                        key={activeConversationId}
                        initialCode={workspaceCode.code}
                        language={workspaceCode.language}
                        conversation={activeConversation}
                        onSendMessage={handleSendMessage}
                        onClose={handleCloseWorkspace}
                    />
                ) : (
                    <>
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="absolute top-4 left-4 z-20 p-2 rounded-full bg-surface-1/50 hover:bg-surface-2/70 transition-colors"
                            aria-label="Toggle sidebar"
                        >
                            <MenuIcon className="h-6 w-6" />
                        </button>
                        <ChatView
                            key={activeConversationId}
                            conversation={activeConversation}
                            onSendMessage={handleSendMessage}
                            onOpenWorkspace={handleOpenWorkspace}
                        />
                    </>
                )}
            </main>
        </div>
    );
};

export default App;