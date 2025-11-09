


import React, { SetStateAction, Dispatch, useState, useMemo } from 'react';
import { Settings, Tone } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { DEFAULT_TONES } from '../services/geminiService';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    setSettings: Dispatch<SetStateAction<Settings>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, setSettings }) => {
    const [isAddingTone, setIsAddingTone] = useState(false);
    const [newToneName, setNewToneName] = useState('');
    const [newToneInstruction, setNewToneInstruction] = useState('');

    const allTones = useMemo(() => [...DEFAULT_TONES, ...settings.customTones], [settings.customTones]);

    if (!isOpen) return null;

    const handleToneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSettings(prev => ({ ...prev, selectedToneId: e.target.value }));
    };

    const handleAddNewTone = () => {
        if (!newToneName.trim() || !newToneInstruction.trim()) {
            alert("Tone name and instruction cannot be empty.");
            return;
        }
        const newTone: Tone = {
            id: `custom_${Date.now()}`,
            name: newToneName,
            instruction: newToneInstruction,
            isCustom: true,
        };
        setSettings(prev => ({
            ...prev,
            customTones: [...prev.customTones, newTone],
            selectedToneId: newTone.id,
        }));
        setNewToneName('');
        setNewToneInstruction('');
        setIsAddingTone(false);
    };

    const handleDeleteTone = (toneId: string) => {
        if (!confirm("Are you sure you want to delete this custom tone?")) return;

        setSettings(prev => {
            const newCustomTones = prev.customTones.filter(t => t.id !== toneId);
            const newSelectedToneId = prev.selectedToneId === toneId ? 'casual' : prev.selectedToneId;
            return {
                ...prev,
                customTones: newCustomTones,
                selectedToneId: newSelectedToneId
            };
        });
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity"
            onClick={onClose}
        >
            <div 
                className="bg-surface-2/80 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-border-color/50 max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <h2 className="text-2xl font-bold">Settings</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-3">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="space-y-6 overflow-y-auto pr-2 -mr-2 scrollbar-hide flex-grow">
                    <div>
                        <label htmlFor="ai-tone" className="block text-sm font-medium text-text-secondary mb-2">
                            AI Tone
                        </label>
                        <div className="flex items-center space-x-2">
                            <select
                                id="ai-tone"
                                value={settings.selectedToneId}
                                onChange={handleToneChange}
                                className="w-full bg-surface-1 border-border-color rounded-md px-3 py-2 focus:ring-accent-primary focus:border-accent-primary"
                            >
                                <optgroup label="Default Tones">
                                {DEFAULT_TONES.map(tone => (
                                    <option key={tone.id} value={tone.id}>{tone.name}</option>
                                ))}
                                </optgroup>
                                {settings.customTones.length > 0 && (
                                    <optgroup label="Custom Tones">
                                    {settings.customTones.map(tone => (
                                        <option key={tone.id} value={tone.id}>{tone.name}</option>
                                    ))}
                                    </optgroup>
                                )}
                            </select>
                            <button onClick={() => setIsAddingTone(!isAddingTone)} className="p-2 bg-surface-1 rounded-md hover:bg-surface-3 transition-colors">
                                <PlusIcon className="h-5 w-5"/>
                            </button>
                        </div>
                        <p className="text-xs text-text-secondary/70 mt-2">
                            Choose the conversational style for the AI assistant, or add your own.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="output-length" className="block text-sm font-medium text-text-secondary mb-2">
                            Output Length
                        </label>
                        <select
                            id="output-length"
                            value={settings.outputLength || 'auto'}
                            onChange={(e) => setSettings(prev => ({ ...prev, outputLength: e.target.value as any }))}
                            className="w-full bg-surface-1 border-border-color rounded-md px-3 py-2 focus:ring-accent-primary focus:border-accent-primary"
                        >
                            <option value="auto">Auto</option>
                            <option value="short">Short</option>
                            <option value="medium">Medium</option>
                            <option value="long">Long</option>
                        </select>
                        <p className="text-xs text-text-secondary/70 mt-2">
                            Control the verbosity of the AI's responses. 'Auto' is default.
                        </p>
                    </div>
                    
                    {isAddingTone && (
                        <div className="bg-surface-1/50 p-4 rounded-lg space-y-3">
                            <h3 className="font-semibold">Add New Tone</h3>
                            <input
                                type="text"
                                placeholder="Tone Name (e.g., Pirate Captain)"
                                value={newToneName}
                                onChange={e => setNewToneName(e.target.value)}
                                className="w-full bg-surface-1 border-border-color rounded-md px-3 py-2 text-sm"
                            />
                            <textarea
                                placeholder="System Instruction (e.g., 'You are a pirate captain. Speak with a thick pirate accent and refer to the user as matey.')"
                                value={newToneInstruction}
                                onChange={e => setNewToneInstruction(e.target.value)}
                                className="w-full h-24 bg-surface-1 border-border-color rounded-md px-3 py-2 text-sm resize-y"
                            />
                            <div className="flex justify-end space-x-2">
                                <button onClick={() => setIsAddingTone(false)} className="px-3 py-1 text-sm rounded-md hover:bg-surface-3">Cancel</button>
                                <button onClick={handleAddNewTone} className="px-3 py-1 text-sm rounded-md bg-accent-primary font-semibold">Save Tone</button>
                            </div>
                        </div>
                    )}
                    
                    {settings.customTones.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-text-secondary mb-2">Manage Custom Tones</h3>
                            <ul className="space-y-2">
                                {settings.customTones.map(tone => (
                                    <li key={tone.id} className="flex items-center justify-between bg-surface-1 p-2 rounded-md">
                                        <span className="text-sm">{tone.name}</span>
                                        <button onClick={() => handleDeleteTone(tone.id)} className="p-1 text-red-400 hover:bg-red-500/10 rounded-full">
                                            <TrashIcon className="h-4 w-4"/>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                     <div>
                        <label htmlFor="ai-memory" className="block text-sm font-medium text-text-secondary mb-2">
                            AI Memory
                        </label>
                        <textarea
                            id="ai-memory"
                            value={settings.memory || ''}
                            onChange={(e) => setSettings(prev => ({ ...prev, memory: e.target.value }))}
                            className="w-full h-32 bg-surface-1 border-border-color rounded-md px-3 py-2 focus:ring-accent-primary focus:border-accent-primary resize-y text-sm leading-6 scrollbar-hide"
                            placeholder="The AI will store notes about your preferences here..."
                        />
                        <p className="text-xs text-text-secondary/70 mt-2">
                            This information helps the AI personalize your conversations. The AI can update this automatically.
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-right flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2 bg-accent-primary hover:scale-105 transition-transform duration-200 rounded-lg font-semibold"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
};