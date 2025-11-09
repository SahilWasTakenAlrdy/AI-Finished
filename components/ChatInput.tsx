


import React, { useState, useRef, ChangeEvent } from 'react';
import { PlusIcon } from './icons/PlusIcon';
import { SendIcon } from './icons/SendIcon';
import { ImageIcon } from './icons/ImageIcon';
import { SearchIcon } from './icons/SearchIcon';
import { MapIcon } from './icons/MapIcon';
import { CloseIcon } from './icons/CloseIcon';
import { CodeIcon } from './icons/CodeIcon';
import { BrainIcon } from './icons/BrainIcon';
import { SpecialMode, Attachment, ImageGenerationModel } from '../types';

interface ChatInputProps {
    onSendMessage: (
        prompt: string, 
        specialMode: SpecialMode | null, 
        imageOptions?: { aspectRatio: string; model: ImageGenerationModel },
        youtubeLink?: string
    ) => void;
    attachments: Attachment[];
    attachmentPreviews: {name: string, url: string}[];
    processFile: (file: File) => Promise<void>;
    clearAttachments: () => void;
}

const SpecialModeChip: React.FC<{ mode: SpecialMode, onRemove: () => void }> = ({ mode, onRemove }) => {
    const modeDetails: { [key in SpecialMode]?: { icon?: React.FC<any>, label: string, color: string } } = {
        deep_thinking: { icon: BrainIcon, label: 'Deep Thinking', color: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
        deep_research: { icon: SearchIcon, label: 'Deep Research', color: 'bg-teal-500/20 text-teal-300 border border-teal-500/30' },
        google_search: { icon: SearchIcon, label: 'Google Search', color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
        google_maps: { icon: MapIcon, label: 'Google Maps', color: 'bg-green-500/20 text-green-300 border border-green-500/30' },
        image_generation: { icon: ImageIcon, label: 'Image Generation', color: 'bg-pink-500/20 text-pink-300 border border-pink-500/30' },
        coding: { icon: CodeIcon, label: 'Coding', color: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' },
    };
    const details = modeDetails[mode];
    if (!details) return null;
    const Icon = details.icon;
    const labelStyle = mode === 'deep_thinking' ? 'font-bold tracking-wider' : 'font-medium';
    
    return (
        <div className={`flex items-center space-x-2 text-sm pl-3 pr-1 py-1 rounded-full ${details.color}`}>
            {Icon && <Icon className="h-4 w-4" />}
            <span className={labelStyle}>{details.label}</span>
            <button onClick={onRemove} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                <CloseIcon className="h-3 w-3" />
            </button>
        </div>
    );
};


export const ChatInput: React.FC<ChatInputProps> = ({ 
    onSendMessage,
    attachments,
    attachmentPreviews,
    processFile,
    clearAttachments
}) => {
    const [prompt, setPrompt] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [specialMode, setSpecialMode] = useState<SpecialMode | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [youtubeLink, setYoutubeLink] = useState<string | null>(null);
    const [youtubePreview, setYoutubePreview] = useState<{id: string; url: string} | null>(null);
    
    const [imageAspectRatio, setImageAspectRatio] = useState<string>("1:1");
    const [imageGenerationModel, setImageGenerationModel] = useState<ImageGenerationModel>('imagen-4.0-generate-001');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/|)([\w-]{11})/;

    const handleMenuSelect = (mode: SpecialMode) => {
        setSpecialMode(mode);
        setIsMenuOpen(false);
        clearAttachments();
        setYoutubeLink(null);
        setYoutubePreview(null);
    };
    
    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSpecialMode(null);
            setYoutubeLink(null);
            setYoutubePreview(null);
            await processFile(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setSpecialMode(null);
            setYoutubeLink(null);
            setYoutubePreview(null);
            processFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };

    const removeSpecialMode = () => {
        setSpecialMode(null);
    };

    const removeYoutubeLink = () => {
        setYoutubeLink(null);
        setYoutubePreview(null);
    };

    const handleSubmit = () => {
        if (!prompt.trim() && attachments.length === 0 && !youtubeLink) return;

        const imageOptions = specialMode === 'image_generation' 
            ? { aspectRatio: imageAspectRatio, model: imageGenerationModel }
            : undefined;

        onSendMessage(prompt, specialMode, imageOptions, youtubeLink ?? undefined);
        setPrompt('');
        setSpecialMode(null);
        setYoutubeLink(null);
        setYoutubePreview(null);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const value = e.currentTarget.value;
        const match = value.match(YOUTUBE_REGEX);

        if (match && match[1]) {
            const videoId = match[1];
            const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;

            setYoutubeLink(fullUrl);
            setYoutubePreview({ id: videoId, url: `https://img.youtube.com/vi/${videoId}/0.jpg` });
            clearAttachments();
            setSpecialMode(null);

            setPrompt(value.replace(YOUTUBE_REGEX, '').trim());
        } else {
            setPrompt(value);
        }

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${e.currentTarget.scrollHeight}px`;
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };
    
    const isSubmitDisabled = !prompt.trim() && attachments.length === 0 && !youtubeLink;

    return (
        <div 
            className={`bg-surface-1 border rounded-2xl p-2 flex flex-col transition-all duration-200 glow-focus-ring glow-border ${isDragging ? 'border-accent-primary shadow-[0_0_20px_var(--accent-glow)]' : 'border-transparent'}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {(specialMode || attachmentPreviews.length > 0 || youtubePreview) && (
                <div className="flex flex-wrap items-center gap-4 px-2 pt-2 pb-3 border-b border-border-color">
                    {specialMode && specialMode !== 'google_search' && <SpecialModeChip mode={specialMode} onRemove={removeSpecialMode} />}
                    {youtubePreview && (
                         <div className="relative group">
                            <img src={youtubePreview.url} alt="YouTube thumbnail" className="h-16 w-auto rounded-lg object-cover border border-border-color"/>
                            <button onClick={removeYoutubeLink} className="absolute top-0 right-0 -mt-2 -mr-2 p-1 bg-surface-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">
                                <CloseIcon className="h-3 w-3"/>
                            </button>
                        </div>
                    )}
                    {attachmentPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                            <img src={preview.url} alt={preview.name} className="h-16 w-16 rounded-lg object-cover border border-border-color"/>
                            <button onClick={clearAttachments} className="absolute top-0 right-0 -mt-2 -mr-2 p-1 bg-surface-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">
                                <CloseIcon className="h-3 w-3"/>
                            </button>
                        </div>
                    ))}
                    {specialMode === 'image_generation' && (
                         <div className="flex items-center gap-4 text-sm text-text-secondary">
                            <div>
                                <label htmlFor="image-model" className="mr-2">Model:</label>
                                <select
                                    id="image-model"
                                    value={imageGenerationModel}
                                    onChange={(e) => setImageGenerationModel(e.target.value as ImageGenerationModel)}
                                    className="bg-surface-2 border-border-color rounded-md px-2 py-1 focus:ring-accent-primary focus:border-accent-primary"
                                >
                                    <option value="imagen-4.0-generate-001">Imagen 4</option>
                                    <option value="gemini-2.5-flash-image">Nano Banana</option>
                                </select>
                            </div>
                             <div>
                                <label htmlFor="aspect-ratio" className="mr-2">Aspect Ratio:</label>
                                <select
                                    id="aspect-ratio"
                                    value={imageAspectRatio}
                                    onChange={(e) => setImageAspectRatio(e.target.value)}
                                    className="bg-surface-2 border-border-color rounded-md px-2 py-1 focus:ring-accent-primary focus:border-accent-primary"
                                >
                                    <option value="1:1">1:1 (Square)</option>
                                    <option value="16:9">16:9 (Landscape)</option>
                                    <option value="9:16">9:16 (Portrait)</option>
                                    <option value="4:3">4:3</option>
                                    <option value="3:4">3:4</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <div className="flex items-start p-2">
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 mr-2 rounded-full text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors">
                        <PlusIcon className="h-6 w-6" />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-60 bg-surface-2/80 backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden z-20 border border-border-color/50">
                            <ul>
                                <MenuItem 
                                    icon={<PlusIcon className="h-5 w-5" />} 
                                    text="Upload" 
                                    onClick={() => { fileInputRef.current?.click(); setIsMenuOpen(false); }} 
                                />
                                <li className="h-px bg-border-color/50 my-1"></li>
                                <MenuItem 
                                    icon={<BrainIcon className="h-5 w-5" />} 
                                    text="Deep Thinking" 
                                    onClick={() => handleMenuSelect('deep_thinking')} 
                                />
                                <MenuItem icon={<CodeIcon className="h-5 w-5" />} text="Coding" onClick={() => handleMenuSelect('coding')} />
                                <MenuItem icon={<MapIcon className="h-5 w-5" />} text="Google Maps" onClick={() => handleMenuSelect('google_maps')} />
                                <MenuItem icon={<SearchIcon className="h-5 w-5" />} text="Deep Research" onClick={() => handleMenuSelect('deep_research')} />
                                <MenuItem icon={<ImageIcon className="h-5 w-5" />} text="Generate Image" onClick={() => handleMenuSelect('image_generation')} />
                            </ul>
                        </div>
                    )}
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,video/*"
                />
                <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Message Gemini, or drop a file..."
                    className="flex-1 bg-transparent resize-none outline-none placeholder-text-secondary max-h-48 scrollbar-hide text-base"
                    rows={1}
                />
                <button onClick={handleSubmit} className="p-3 ml-2 rounded-full bg-accent-primary hover:scale-105 disabled:bg-surface-3 disabled:hover:scale-100 disabled:text-text-secondary transition-all duration-200 text-white" disabled={isSubmitDisabled}>
                    <SendIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

const MenuItem: React.FC<{ icon: React.ReactNode, text: string, onClick: () => void }> = ({ icon, text, onClick }) => (
    <li
        onClick={onClick}
        className="flex items-center px-4 py-3 hover:bg-surface-3/50 cursor-pointer transition-colors text-text-secondary hover:text-text-primary"
    >
        <div className="w-5 h-5 mr-4 flex items-center justify-center">{icon}</div>
        <span className="text-sm font-medium">{text}</span>
    </li>
);