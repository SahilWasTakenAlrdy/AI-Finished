
import React from 'react';
import { GeminiModel } from '../types';

interface ModelSelectorProps {
    selectedModel: GeminiModel;
    onModelChange: (model: GeminiModel) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
    const models: { id: GeminiModel; name: string }[] = [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    ];

    return (
        <div className="flex items-center bg-gray-800 rounded-full p-1">
            {models.map((model) => (
                <button
                    key={model.id}
                    onClick={() => onModelChange(model.id)}
                    className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${
                        selectedModel === model.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    {model.name}
                </button>
            ))}
        </div>
    );
};
