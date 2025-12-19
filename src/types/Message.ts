export type Sender = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  content: string;
  sender: Sender;
  timestamp: Date;
}
