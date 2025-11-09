import React, { useState, useRef, useEffect } from 'react';
import { Conversation } from '../types';
import { SettingsIcon } from './icons/SettingsIcon';
import { PlusIcon } from './icons/PlusIcon';
import { ChatIcon } from './icons/ChatIcon';
import { MoreVerticalIcon } from './icons/MoreVerticalIcon';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';

interface SidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onDeleteConversation: (id: string) => void;
    onRenameConversation: (id: string, newTitle: string) => void;
    onOpenSettings: () => void;
    isOpen: boolean;
}

const ConversationItem: React.FC<{
    conv: Conversation;
    isActive: boolean;
    onSelect: () => void;
    onDelete: (id: string) => void;
    onRename: (id: string, newTitle: string) => void;
}> = ({ conv, isActive, onSelect, onDelete, onRename }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempTitle, setTempTitle] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');

    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        if (openMenuId) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openMenuId]);

    const handleStartEditing = (id: string, currentTitle: string) => {
        setOpenMenuId(null);
        setEditingId(id);
        setTempTitle(currentTitle);
    };

    const handleFinishEditing = () => {
        if (editingId && tempTitle.trim()) {
            onRename(editingId, tempTitle.trim());
        }
        setEditingId(null);
        setTempTitle('');
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleFinishEditing();
        } else if (e.key === 'Escape') {
            setEditingId(null);
            setTempTitle('');
        }
    };

    const handleMenuToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (openMenuId === conv.id) {
            setOpenMenuId(null);
            return;
        }

        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 100; // Approximate height of the menu

            if (spaceBelow < menuHeight) {
                setMenuPosition('top');
            } else {
                setMenuPosition('bottom');
            }
        }
        setOpenMenuId(conv.id);
    };

    return (
        <li className="relative">
            <div
                onClick={() => { if (editingId !== conv.id) onSelect() }}
                className={`flex items-center p-3 rounded-xl transition-all duration-200 group cursor-pointer ${
                    isActive
                        ? 'bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 text-text-primary shadow-[0_0_15px_var(--accent-glow)]'
                        : 'hover:bg-surface-2 text-text-secondary hover:text-text-primary'
                }`}
            >
                {isActive && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-accent-primary rounded-r-full"></div>
                )}
                <ChatIcon className={`h-5 w-5 mr-3 flex-shrink-0 ${isActive ? 'text-accent-primary' : ''}`} />
                {editingId === conv.id ? (
                    <input
                        ref={inputRef}
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onBlur={handleFinishEditing}
                        onKeyDown={handleKeyDown}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-surface-3 rounded px-1 text-sm focus:outline-none w-full"
                    />
                ) : (
                    <span
                        className="flex-1 truncate text-sm font-medium"
                        title={conv.title}
                    >
                        {conv.title}
                    </span>
                )}
                <div className="relative ml-auto">
                    <button
                        ref={buttonRef}
                        onClick={handleMenuToggle}
                        className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-surface-3 focus:opacity-100 transition-opacity"
                        title="More options"
                    >
                        <MoreVerticalIcon className="h-4 w-4" />
                    </button>
                    {openMenuId === conv.id && (
                        <div 
                            ref={menuRef} 
                            className={`absolute right-0 w-36 bg-surface-2/95 backdrop-blur-lg rounded-lg shadow-2xl z-20 border border-border-color/50 text-left overflow-hidden transition-opacity duration-150 ease-in-out ${
                                menuPosition === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
                            }`}
                        >
                            <ul className="py-1">
                                <li>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleStartEditing(conv.id, conv.title); }}
                                        className="w-full flex items-center px-3 py-2 text-sm text-text-secondary hover:bg-surface-3/50 hover:text-text-primary"
                                    >
                                        <EditIcon className="h-4 w-4 mr-2" />
                                        Rename
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                                        className="w-full flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                                    >
                                        <TrashIcon className="h-4 w-4 mr-2" />
                                        Delete
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </li>
    );
};


export const Sidebar: React.FC<SidebarProps> = ({
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation,
    onRenameConversation,
    onOpenSettings,
    isOpen,
}) => {
    if (!isOpen) return null;

    return (
        <div className="flex flex-col h-full bg-surface-1 p-3 border-r border-border-color">
            <div className="flex items-center justify-between mb-4 flex-shrink-0 px-2">
                <h1 className="text-xl font-semibold text-text-primary">Conversations</h1>
                <button
                    onClick={onNewConversation}
                    className="p-2 rounded-full text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-all duration-200"
                    title="New Conversation"
                >
                    <PlusIcon className="h-6 w-6" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide -mr-2 pr-2">
                <ul className="space-y-1">
                    {conversations.map((conv) => (
                        <ConversationItem
                            key={conv.id}
                            conv={conv}
                            isActive={activeConversationId === conv.id}
                            onSelect={() => onSelectConversation(conv.id)}
                            onDelete={onDeleteConversation}
                            onRename={onRenameConversation}
                        />
                    ))}
                </ul>
            </div>
            <div className="mt-4 pt-4 border-t border-border-color flex-shrink-0">
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        onOpenSettings();
                    }}
                    className="flex items-center p-3 rounded-xl text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors"
                >
                    <SettingsIcon className="h-5 w-5 mr-3" />
                    <span className="text-sm font-medium">Settings</span>
                </a>
            </div>
        </div>
    );
};