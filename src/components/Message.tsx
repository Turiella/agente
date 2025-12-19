// src/components/Message.tsx
import React from 'react';
import type { Sender } from '../types/Message';

interface MessageProps {
  content: string;
  sender: Sender;
  timestamp: Date;
}

const Message: React.FC<MessageProps> = ({ content, sender, timestamp }) => {
  return (
    <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] p-3 rounded-lg ${
          sender === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}
      >
        <div className="message-content whitespace-pre-wrap break-words">{content}</div>
        <div className="text-xs opacity-70 mt-1">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default Message;