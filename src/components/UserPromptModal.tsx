import React, { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { UserPrompt } from '../types/deployment';

interface UserPromptModalProps {
  prompt: UserPrompt;
  onResponse: (response: string) => void;
  onCancel: () => void;
}

const UserPromptModal: React.FC<UserPromptModalProps> = ({ prompt, onResponse, onCancel }) => {
  const [response, setResponse] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (response.trim() || !prompt.required) {
      onResponse(response.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">需要您的输入</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-gray-700 mb-4">{prompt.message}</p>
            
            {prompt.inputType === 'select' && prompt.options ? (
              <select
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={prompt.required}
              >
                <option value="">请选择...</option>
                {prompt.options.map((option, index) => (
                  <option key={index} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : prompt.inputType === 'confirm' ? (
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => onResponse('yes')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  确认
                </button>
                <button
                  type="button"
                  onClick={() => onResponse('no')}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="请输入您的回复..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                required={prompt.required}
              />
            )}
          </div>

          {prompt.inputType !== 'confirm' && (
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={prompt.required && !response.trim()}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>发送</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default UserPromptModal;