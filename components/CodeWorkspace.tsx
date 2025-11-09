import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, Content, Attachment, SpecialMode, ImageGenerationModel } from '../types';
import { Message as MessageComponent } from './Message';
import { ChatInput } from './ChatInput';
import { CloseIcon } from './icons/CloseIcon';
import { PlayIcon } from './icons/PlayIcon';
import { CodeIcon } from './icons/CodeIcon';
import { EyeIcon } from './icons/EyeIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { FileCodeIcon } from './icons/FileCodeIcon';
import { fileToBase64, getVideoFirstFrame } from '../utils/fileUtils';

interface CodeWorkspaceProps {
    conversation: Conversation | null;
    // FIX: Updated onSendMessage signature to include youtubeLink and be compatible with App's handleSendMessage
    onSendMessage: (content: Content, attachments: Attachment[], specialMode: SpecialMode | null, imageOptions?: { aspectRatio: string; model: ImageGenerationModel }, youtubeLink?: string) => void;
    onClose: () => void;
    initialCode: string;
    language: string;
}

const languageToFile = (lang: string) => {
    const l = lang.toLowerCase();
    if (['javascript', 'js'].includes(l)) return 'script.js';
    if (l === 'python') return 'main.py';
    if (l === 'html') return 'index.html';
    if (l === 'css') return 'style.css';
    if (l === 'typescript' || l === 'ts') return 'script.ts';
    return 'file';
}

export const CodeWorkspace: React.FC<CodeWorkspaceProps> = ({ 
    conversation, 
    onSendMessage,
    onClose,
    initialCode,
    language
}) => {
    const [code, setCode] = useState(initialCode);
    const [previewContent, setPreviewContent] = useState('');
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
    const [chatPaneWidth, setChatPaneWidth] = useState(40); // Initial width percentage
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [fileName, setFileName] = useState('file');

    // FIX: Added state and handlers for attachments to properly use ChatInput
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [attachmentPreviews, setAttachmentPreviews] = useState<{name: string, url: string}[]>([]);

    useEffect(() => {
        setFileName(languageToFile(language));
    }, [language]);

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

    const handleRunCode = useCallback(() => {
        let html = '';
        const lang = language.toLowerCase();
        
        const sanitizedCode = code.replace(/<\/script>/g, '<\\/script>');
        
        const baseHtml = (bodyContent: string, headContent: string = '') => `
            <!DOCTYPE html>
            <html>
                <head>
                    <style>
                        body {
                            font-family: 'Inter', sans-serif;
                            background-color: #111214; 
                            color: #f0f0f5;
                            margin: 1rem;
                        }
                    </style>
                    ${headContent}
                </head>
                <body>
                    ${bodyContent}
                    <script>
                        // Capture and forward console.log messages
                        const originalLog = console.log;
                        console.log = function(...args) {
                            try {
                                const pre = document.createElement('pre');
                                pre.style.color = '#a0a2ab';
                                pre.textContent = args.map(arg => {
                                    if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
                                    return arg;
                                }).join(' ');
                                document.body.appendChild(pre);
                            } catch (e) {
                                // Fallback for circular structures
                                originalLog.apply(console, args);
                            }
                            originalLog.apply(console, args);
                        }
                    </script>
                </body>
            </html>
        `;

        if (lang === 'html') {
            html = code;
        } else if (lang === 'javascript' || lang === 'js') {
            html = baseHtml(`<script>${sanitizedCode}</script>`);
        } else if (lang === 'css') {
            html = baseHtml('', `<style>${code}</style>`);
        } else {
             html = baseHtml(`<pre style="font-family: monospace; white-space: pre-wrap; word-break: break-all;">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`);
        }
        setPreviewContent(html);
        setActiveTab('preview');
    }, [code, language]);
    
    const handleCopyCode = () => {
        navigator.clipboard.writeText(code);
    };

    useEffect(() => {
        handleRunCode();
    }, [handleRunCode]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isResizing && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            const clampedWidth = Math.max(20, Math.min(80, newWidth));
            setChatPaneWidth(clampedWidth);
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);


    const TabButton: React.FC<{tab: 'code' | 'preview', label: string, icon: React.FC<any>}> = ({ tab, label, icon: Icon }) => (
        <button 
            onClick={() => setActiveTab(tab)}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === tab ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:bg-surface-2'}`}
        >
            <Icon className="h-4 w-4"/>
            <span>{label}</span>
        </button>
    );

    return (
        <div className="flex h-full w-full bg-surface-1" ref={containerRef}>
            {/* Left Pane: Chat */}
            <div className="flex flex-col h-full" style={{ width: `${chatPaneWidth}%`}}>
                <header className="flex items-center justify-between p-4 flex-shrink-0 z-10 border-b border-border-color">
                    <h2 className="font-semibold text-lg text-text-secondary truncate">{conversation?.title ?? 'Conversation'}</h2>
                </header>
                <div className="flex-1 overflow-y-auto px-4">
                    {conversation && conversation.messages.map((msg, index) => (
                        <MessageComponent key={`${msg.id}-${index}`} message={msg} isInWorkspace={true} />
                    ))}
                </div>
                 <div className="p-4 border-t border-border-color bg-surface-1">
                    {/* FIX: Replaced incorrect ChatInput call with a fully functional one */}
                    <ChatInput 
                        onSendMessage={handleSendMessageWrapper}
                        attachments={attachments}
                        attachmentPreviews={attachmentPreviews}
                        processFile={processFile}
                        clearAttachments={clearAttachments}
                    />
                </div>
            </div>

            {/* Resizer */}
            <div 
                className="w-1.5 cursor-col-resize bg-border-color hover:bg-accent-primary transition-colors flex-shrink-0"
                onMouseDown={handleMouseDown}
            />

            {/* Right Pane: Editor / Preview */}
            <div className="flex flex-col h-full" style={{ width: `${100 - chatPaneWidth}%`}}>
                <header className="flex items-center justify-between p-2 bg-surface-1 border-b border-border-color flex-shrink-0">
                    <div className="flex items-center bg-surface-2 rounded-lg p-1 space-x-1">
                        <TabButton tab="code" label="Code" icon={CodeIcon}/>
                        <TabButton tab="preview" label="Preview" icon={EyeIcon}/>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={handleRunCode} 
                            className="flex items-center space-x-2 px-3 py-2 text-sm font-semibold rounded-lg bg-green-600/20 text-green-300 hover:bg-green-500/30 border border-green-500/30 transition-all duration-200 hover:shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                        >
                            <PlayIcon className="h-4 w-4" />
                            <span>Run</span>
                        </button>
                         <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-2 transition-colors">
                            <CloseIcon className="h-6 w-6"/>
                        </button>
                    </div>
                </header>
                <div className="flex-1 bg-[#1e1e1e] flex overflow-hidden">
                    {activeTab === 'code' ? (
                        <>
                            <div className="w-56 bg-surface-1/50 p-2 border-r border-border-color">
                                <h3 className="text-xs uppercase font-bold text-text-secondary tracking-wider px-2 mb-2">File Explorer</h3>
                                <ul>
                                    <li className="flex items-center space-x-2 p-2 rounded bg-accent-primary/20">
                                        <FileCodeIcon className="h-4 w-4 text-accent-secondary flex-shrink-0"/>
                                        <span className="text-sm text-text-primary truncate">{fileName}</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="flex-1 flex flex-col">
                                <div className="flex-shrink-0 bg-surface-2">
                                    <div className="flex items-center space-x-2 px-4 py-2 bg-surface-3 border-b border-border-color text-sm text-text-primary w-fit rounded-t-lg">
                                        <FileCodeIcon className="h-4 w-4 text-accent-secondary"/>
                                        <span>{fileName}</span>
                                    </div>
                                </div>
                                <div className="flex-1 relative">
                                    <textarea
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="w-full h-full bg-[#1e1e1e] text-gray-200 font-mono p-4 resize-none outline-none text-sm leading-6 selection:bg-accent-primary selection:text-white absolute inset-0"
                                        spellCheck="false"
                                    />
                                </div>
                                <div className="flex-shrink-0 bg-surface-2 p-1 border-t border-border-color flex justify-end">
                                    <button 
                                        onClick={handleCopyCode}
                                        className="flex items-center space-x-2 px-2 py-1 text-xs font-semibold rounded-md bg-surface-3 text-text-secondary hover:bg-surface-1 transition-all duration-200"
                                        title="Copy Code"
                                    >
                                        <ClipboardIcon className="h-3 w-3" />
                                        <span>Copy Code</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <iframe
                            srcDoc={previewContent}
                            title="Code Preview"
                            className="w-full h-full bg-background border-0"
                            sandbox="allow-scripts allow-modals"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
