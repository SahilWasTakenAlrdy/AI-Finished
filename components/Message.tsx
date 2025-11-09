


import React from 'react';
import { Message as MessageType, Role } from '../types';
import { UserIcon } from './icons/UserIcon';
import { GeminiIcon } from './icons/GeminiIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { SearchIcon } from './icons/SearchIcon';
import { MapIcon } from './icons/MapIcon';
import { TerminalIcon } from './icons/TerminalIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface MessageProps {
    message: MessageType;
    onOpenWorkspace?: (code: string, language: string) => void;
    isInWorkspace?: boolean;
}

const SimpleMarkdown: React.FC<{ text: string }> = React.memo(({ text }) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\)|https?:\/\/\S+)/g);

    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <em key={i}>{part.slice(1, -1)}</em>;
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                    return <code key={i} className="bg-surface-3 text-pink-300 rounded px-1.5 py-1 text-sm font-mono">{part.slice(1, -1)}</code>;
                }
                if (part.match(/^\[.*\]\(.*\)$/)) {
                    const match = part.match(/^\[(.*)\]\((.*)\)$/);
                    if(match) return <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{match[1]}</a>;
                }
                if (part.match(/^https?:\/\/\S+/)) {
                     return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{part}</a>;
                }
                return <React.Fragment key={i}>{part.split('\n').map((line, j) => <React.Fragment key={j}>{line}{j < part.split('\n').length - 1 && <br/>}</React.Fragment>)}</React.Fragment>;
            })}
        </>
    );
});

export const Message: React.FC<MessageProps> = ({ message, onOpenWorkspace, isInWorkspace = false }) => {
    const isUser = message.role === Role.User;

    const icon = isUser ? (
        <div className="h-8 w-8 rounded-full bg-surface-3 flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-text-secondary" />
        </div>
    ) : (
         <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-[0_0_10px_var(--accent-glow)]">
            <GeminiIcon className="h-5 w-5 text-white" />
        </div>
    );

    const codeBlockRegex = /^(```(\w*)\n([\s\S]*?)\n```)/m;
    const match = message.content.match(codeBlockRegex);

    const contentWithoutCode = match ? message.content.replace(codeBlockRegex, '').trim() : message.content;
    const codeDetails = match ? { language: match[2] || 'plaintext', code: match[3] } : null;
    
    const youtubeVideoId = message.youtubeLink?.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/|)([\w-]{11})/)?.[1];

    return (
        <div className={`flex items-start space-x-4 py-8`}>
            <div className="flex-shrink-0 mt-1">{icon}</div>
            <div className="flex-1">
                <div className="font-semibold text-lg mb-2 text-text-primary">{isUser ? 'You' : 'Gemini'}</div>
                {message.isLoading && !message.content ? (
                    <div className="flex items-center space-x-2 text-text-secondary">
                        <SpinnerIcon className="h-5 w-5 animate-spin"/>
                        <span>Thinking...</span>
                    </div>
                ) : message.isError ? (
                     <div className="text-red-400">
                        <p><strong>Error:</strong> {message.content}</p>
                     </div>
                ) : (
                    <div className="prose prose-invert text-text-secondary max-w-none space-y-4 leading-relaxed">
                        {contentWithoutCode && (
                            <p>
                                <SimpleMarkdown text={contentWithoutCode} />
                                {message.isLoading && <span className="inline-block w-2 h-5 bg-white/70 ml-1 animate-pulse" style={{ verticalAlign: 'bottom' }} />}
                            </p>
                        )}
                        
                        {codeDetails && (
                             <div className="bg-surface-1 rounded-lg my-4 border border-border-color">
                                <div className="flex justify-between items-center px-4 py-2 bg-surface-2 rounded-t-lg">
                                    <span className="text-sm text-text-secondary font-sans">{codeDetails.language}</span>
                                </div>
                                <pre className="p-4 overflow-x-auto text-sm font-mono"><code>{codeDetails.code}</code></pre>
                                {!isInWorkspace && onOpenWorkspace && !message.isLoading && (
                                    <div className="border-t border-border-color p-2 flex justify-end">
                                        <button 
                                            onClick={() => onOpenWorkspace(codeDetails.code, codeDetails.language)} 
                                            className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-md bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-all duration-200 hover:shadow-[0_0_10px_rgba(45,212,191,0.3)]"
                                        >
                                            <TerminalIcon className="h-4 w-4 mr-2 text-accent-secondary" />
                                            Open in Workspace
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {youtubeVideoId && (
                            <a href={message.youtubeLink} target="_blank" rel="noopener noreferrer" className="block mt-4 w-fit">
                                <img 
                                    src={`https://img.youtube.com/vi/${youtubeVideoId}/0.jpg`} 
                                    alt="YouTube thumbnail" 
                                    className="max-w-xs rounded-lg border border-border-color hover:opacity-80 transition-opacity"
                                />
                            </a>
                        )}

                        {message.attachments && message.attachments.map((att, index) => (
                            <div key={index} className="relative group mt-4 w-fit">
                                <img 
                                    src={`data:${att.mimeType};base64,${att.data}`} 
                                    alt="attachment" 
                                    className="max-w-sm rounded-lg border border-border-color"
                                />
                                {!isUser && (
                                     <a
                                        href={`data:${att.mimeType};base64,${att.data}`}
                                        download={`gemini-image-${message.id}.png`}
                                        className="absolute top-2 right-2 p-2 bg-surface-2/70 backdrop-blur-sm rounded-full text-text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110"
                                        title="Download Image"
                                    >
                                        <DownloadIcon className="h-5 w-5" />
                                    </a>
                                )}
                            </div>
                        ))}

                        {message.groundingSources && message.groundingSources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border-color">
                                <h4 className="text-sm font-semibold text-text-secondary mb-2">Sources:</h4>
                                <ul className="space-y-2">
                                    {message.groundingSources.map((source, index) => (
                                        <li key={index} className="text-xs">
                                            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-400 hover:underline">
                                                {source.uri.includes('google.com/maps') ? <MapIcon className="h-4 w-4 mr-2"/> : <SearchIcon className="h-4 w-4 mr-2"/>}
                                                <span className="truncate">{source.title}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};