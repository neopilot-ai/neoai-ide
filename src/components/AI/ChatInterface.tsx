'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAIStore, useEditorStore } from '@/store';
import { AIMessage, AIChat } from '@/types';
import clsx from 'clsx';

interface ChatInterfaceProps {
  className?: string;
}

interface MessageProps {
  message: AIMessage;
  onCopy: (content: string) => void;
  onApply?: (content: string) => void;
}

const Message: React.FC<MessageProps> = ({ message, onCopy, onApply }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCodeBlock = message.content.includes('```');
  const codeBlocks = isCodeBlock ? message.content.split('```') : [];

  return (
    <div
      className={clsx('flex gap-3 p-4', {
        'bg-gray-800': message.role === 'assistant',
        'bg-gray-900': message.role === 'user',
      })}
    >
      <div className="flex-shrink-0">
        {message.role === 'assistant' ? (
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">U</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">
            {message.role === 'assistant' ? 'AI Assistant' : 'You'}
          </span>
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>

        <div className="prose prose-invert max-w-none">
          {isCodeBlock ? (
            <div>
              {codeBlocks.map((block, index) => {
                if (index % 2 === 0) {
                  // Text block
                  return (
                    <p key={index} className="text-gray-300 whitespace-pre-wrap">
                      {block}
                    </p>
                  );
                } else {
                  // Code block
                  const lines = block.split('\n');
                  const language = lines[0] || 'text';
                  const code = lines.slice(1).join('\n');

                  return (
                    <div key={index} className="relative mt-4">
                      <div className="bg-gray-900 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                          <span className="text-xs text-gray-400">{language}</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={handleCopy}
                              className="p-1 text-gray-400 hover:text-white rounded transition-colors duration-150"
                              title="Copy code"
                            >
                              {copied ? (
                                <CheckIcon className="w-4 h-4 text-green-400" />
                              ) : (
                                <ClipboardDocumentIcon className="w-4 h-4" />
                              )}
                            </button>
                            {onApply && (
                              <button
                                onClick={() => onApply(code)}
                                className="px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors duration-150"
                                title="Apply to current file"
                              >
                                Apply
                              </button>
                            )}
                          </div>
                        </div>
                        <pre className="p-4 overflow-x-auto">
                          <code className="text-sm text-gray-300">{code}</code>
                        </pre>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            <p className="text-gray-300 whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {message.tokens && (
          <div className="mt-2 text-xs text-gray-500">
            Tokens: {message.tokens.input + message.tokens.output} • Cost: ${message.cost?.toFixed(4)}
          </div>
        )}
      </div>
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className }) => {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    chats,
    activeChatId,
    isGenerating,
    selectedModel,
    addChat,
    addMessage,
    setGenerating,
  } = useAIStore();

  const { tabs, activeTabId } = useEditorStore();

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const message = input.trim();
    setInput('');

    // Create new chat if none exists
    let chatId = activeChatId;
    if (!chatId) {
      const newChat: AIChat = {
        id: `chat-${Date.now()}`,
        projectId: 'current-project', // TODO: Get from current project
        messages: [],
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addChat(newChat);
      chatId = newChat.id;
    }

    // Add user message
    const userMessage: AIMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    addMessage(chatId, userMessage);

    // Generate AI response
    setGenerating(true);
    try {
      // TODO: Call actual AI service
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      const assistantMessage: AIMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `I understand you want to: "${message}"\n\nHere's a sample response. In the actual implementation, this would be generated by the AI model based on your request and the current code context.\n\n\`\`\`typescript\n// Sample code response\nfunction handleUserRequest(request: string) {\n  console.log('Processing:', request);\n  return 'Response generated';\n}\n\`\`\``,
        timestamp: new Date(),
        model: selectedModel,
        tokens: { input: 50, output: 100 },
        cost: 0.0015,
      };
      addMessage(chatId, assistantMessage);
    } catch (error) {
      console.error('AI generation error:', error);
      const errorMessage: AIMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
        model: selectedModel,
      };
      addMessage(chatId, errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopy = (content: string) => {
    // TODO: Show toast notification
    console.log('Copied to clipboard:', content);
  };

  const handleApply = (code: string) => {
    if (activeTab) {
      // TODO: Apply code to active tab
      console.log('Apply code to tab:', activeTab.name, code);
    }
  };

  const quickPrompts = [
    'Explain this code',
    'Refactor this function',
    'Add error handling',
    'Generate tests',
    'Optimize performance',
    'Add documentation',
  ];

  return (
    <div className={clsx('flex flex-col bg-gray-900 border-l border-gray-700', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-5 h-5 text-primary-400" />
          <h3 className="text-sm font-medium text-gray-300">AI Assistant</h3>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedModel}
            onChange={(e) => {
              // TODO: Update selected model
              console.log('Selected model:', e.target.value);
            }}
            className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-300"
          >
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="claude-3-haiku">Claude 3 Haiku</option>
          </select>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors duration-150"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <XMarkIcon className="w-4 h-4" />
            ) : (
              <SparklesIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {!activeChat || activeChat.messages.length === 0 ? (
          <div className="p-6 text-center">
            <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h4 className="text-lg font-medium text-gray-300 mb-2">
              AI Assistant Ready
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              Ask me anything about your code or request help with development tasks.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="p-2 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-gray-300 transition-colors duration-150"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {activeChat.messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                onCopy={handleCopy}
                onApply={message.role === 'assistant' ? handleApply : undefined}
              />
            ))}
            {isGenerating && (
              <div className="flex gap-3 p-4 bg-gray-800">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                    <span className="text-sm text-gray-400">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI about your code..."
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={1}
              style={{
                minHeight: '36px',
                maxHeight: '120px',
                height: 'auto',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-150 flex-shrink-0"
            title="Send message"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
