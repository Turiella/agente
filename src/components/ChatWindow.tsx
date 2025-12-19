// src/components/ChatWindow.tsx
import React, { useEffect, useRef } from 'react';
import type { Message as MessageType } from '../types/Message';
import Message from './Message';

interface ChatWindowProps {
  messages: MessageType[];
  isTyping?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isTyping = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <Message
          key={message.id || `msg-${index}`}
          content={message.content}
          sender={message.sender}
          timestamp={message.timestamp}
        />
      ))}
      {isTyping && (
        <div className="flex items-start space-x-2">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 max-w-xs">
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;