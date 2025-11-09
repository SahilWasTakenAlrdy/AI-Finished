



import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Conversation, Message, Content, Attachment, SpecialMode, ImageGenerationModel } from '../types';
import { Message as MessageComponent } from './Message';
import { ChatInput } from './ChatInput';
import { GeminiIcon } from './icons/GeminiIcon';
import { fileToBase64, getVideoFirstFrame } from '../utils/fileUtils';

interface ChatViewProps {
    conversation: Conversation | null;
    onSendMessage: (content: Content, attachments: Attachment[], specialMode: SpecialMode | null, imageOptions?: { aspectRatio: string; model: ImageGenerationModel }, youtubeLink?: string) => void;
    onOpenWorkspace?: (code: string, language: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ conversation, onSendMessage, onOpenWorkspace }) => {
    const hasMessages = conversation && conversation.messages.length > 0;
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [attachmentPreviews, setAttachmentPreviews] = useState<{name: string, url: string}[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to bottom whenever messages change or on initial load with messages
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [conversation?.messages]);
    
    const processFile = useCallback(async (file: File) => {
        if (!file) return;

        try {
            if (file.type.startsWith('image/')) {
                const base64 = await fileToBase64(file);
                setAttachments([{ type: 'image', data: base64, mimeType: file.type }]);
                setAttachmentPreviews([{ name: file.name, url: URL.createObjectURL(file) }]);
            } else if (file.type.startsWith('video/')) {
                const { dataUrl } = await getVideoFirstFrame(file);
                const base64 = dataUrl.split(',')[1];
                setAttachments([{ type: 'video', data: base64, mimeType: 'image/jpeg' }]);
                setAttachmentPreviews([{ name: file.name, url: dataUrl }]);
            } else {
                alert("Unsupported file type. Please upload an image or video.");
            }
        } catch (error) {
            console.error("Error processing file:", error);
            alert("Failed to process file.");
        }
    }, []);

    const clearAttachments = useCallback(() => {
        setAttachments([]);
        setAttachmentPreviews([]);
    }, []);

    const handleSendMessageWrapper = (content: Content, specialMode: SpecialMode | null, imageOptions?: { aspectRatio: string; model: ImageGenerationModel }, youtubeLink?: string) => {
        onSendMessage(content, attachments, specialMode, imageOptions, youtubeLink);
        clearAttachments();
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (dragCounter.current > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };

    const chatInputComponent = (
        <ChatInput 
            onSendMessage={handleSendMessageWrapper}
            attachments={attachments}
            attachmentPreviews={attachmentPreviews}
            processFile={processFile}
            clearAttachments={clearAttachments}
        />
    );

    return (
        <div 
            className="flex flex-col h-full w-full bg-background overflow-hidden relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {isDragging && (
                 <div className="absolute inset-0 bg-accent-primary/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none border-4 border-dashed border-accent-primary rounded-2xl m-4">
                    <p className="text-2xl font-bold text-white">Drop file to attach</p>
                </div>
            )}
            <header className="flex items-center justify-center p-4 flex-shrink-0 z-10">
                <h2 className="font-semibold text-lg text-text-secondary truncate">{conversation?.title ?? 'New Conversation'}</h2>
            </header>

            {hasMessages ? (
                <>
                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16">
                        <div className="max-w-4xl mx-auto w-full">
                            {conversation.messages.map((msg, index) => (
                                <MessageComponent 
                                    key={`${msg.id}-${index}`} 
                                    message={msg}
                                    onOpenWorkspace={onOpenWorkspace}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="px-4 md:px-8 lg:px-16 pb-4 bg-background">
                        <div className="max-w-4xl mx-auto w-full">
                            {chatInputComponent}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col justify-center items-center pb-24">
                    <div className="flex flex-col items-center justify-center text-text-secondary text-center mb-8">
                        <div className="h-20 w-20 mb-4 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-[0_0_20px_var(--accent-glow)]">
                            <GeminiIcon className="h-12 w-12 text-white" />
                        </div>
                        <h2 className="text-3xl font-semibold">How can I help you today?</h2>
                    </div>
                    <div className="w-full max-w-4xl px-4">
                        {chatInputComponent}
                    </div>
                </div>
            )}
        </div>
    );
};