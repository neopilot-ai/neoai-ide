export interface ChatMessage {
  sender: 'Human' | 'AI' | 'System';
  content: string;
  timestamp: string;
  contexts?: Array<{ content: string; sourceLink: string; }>;
  accumulatedContexts?: Array<{ content: string; sourceLink: string; }>;
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
  contextCount: number;
  type: 'docs' | 'runbooks';
}

const STORAGE_KEY_PREFIX = 'chat_history_';
const MAX_CHATS = 50;

export class ChatHistoryStorage {
  private storageKey: string;

  constructor(type: 'docs' | 'runbooks') {
    this.storageKey = `${STORAGE_KEY_PREFIX}${type}`;
  }

  // Get all chat history
  getAll(): ChatHistoryItem[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }

  // Save a chat (add new or update existing)
  save(chat: ChatHistoryItem): void {
    try {
      const existing = this.getAll();
      const existingIndex = existing.findIndex(c => c.id === chat.id);
      
      if (existingIndex >= 0) {
        // Update existing
        existing[existingIndex] = chat;
      } else {
        // Add new chat at the beginning
        existing.unshift(chat);
      }
      
      // Keep only the most recent chats
      const trimmed = existing.slice(0, MAX_CHATS);
      
      localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  // Delete a specific chat
  delete(chatId: string): void {
    try {
      const existing = this.getAll();
      const filtered = existing.filter(c => c.id !== chatId);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting chat history:', error);
    }
  }

  // Clear all chat history
  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  }

  // Get a specific chat by ID
  get(chatId: string): ChatHistoryItem | null {
    const all = this.getAll();
    return all.find(c => c.id === chatId) || null;
  }

  // Generate a title from the first message
  static generateTitle(firstMessage: string): string {
    const words = firstMessage.trim().split(' ').slice(0, 6);
    return words.join(' ') + (firstMessage.split(' ').length > 6 ? '...' : '');
  }

  // Generate a unique chat ID
  static generateId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}