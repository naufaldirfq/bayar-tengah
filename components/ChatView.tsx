import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Sparkles, X } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
  receiptLoaded: boolean;
  onClose?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ 
  messages, 
  onSendMessage, 
  isProcessing, 
  receiptLoaded,
  onClose
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing && receiptLoaded) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm shrink-0 h-[72px]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-md">
               <MessageSquare className="w-5 h-5" />
          </div>
          <div>
             <h2 className="font-bold text-slate-800 text-lg leading-tight">AI Assistant</h2>
             <p className="text-xs text-slate-500">
               {receiptLoaded ? 'Ready to help' : 'Waiting for receipt...'}
             </p>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            title="Close Chat"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60 p-6">
             <div className="bg-indigo-50 p-4 rounded-full">
               <Sparkles className="w-8 h-8 text-indigo-400" />
             </div>
             <div className="max-w-xs text-sm text-slate-500">
                <p className="font-medium text-slate-700 mb-2">I can help you update the bill!</p>
                <p>Try saying:</p>
                <ul className="mt-2 space-y-1.5 text-slate-600 bg-white p-3 rounded-lg border border-slate-200 text-left text-xs shadow-sm">
                  <li>• "Tom had the burger"</li>
                  <li>• "Sarah and Jane shared the pizza"</li>
                  <li>• "Split the appetizers between everyone"</li>
                </ul>
             </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : msg.isError 
                    ? 'bg-red-50 text-red-600 border border-red-100 rounded-bl-none'
                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isProcessing && (
           <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center gap-2">
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!receiptLoaded || isProcessing}
            placeholder={receiptLoaded ? "Type a command..." : "Upload receipt first"}
            className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || !receiptLoaded || isProcessing}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white p-3 rounded-xl transition-colors shadow-lg shadow-indigo-200 disabled:shadow-none"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};