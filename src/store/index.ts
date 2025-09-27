import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  AppState,
  EditorState,
  AIState,
  AppConfig,
  User,
  Project,
  EditorTab,
  FileNode,
  AIChat,
  AIMessage,
} from '@/types';

// App Store
interface AppStore extends AppState {
  setUser: (user: User | null) => void;
  setCurrentProject: (project: Project | null) => void;
}

export const useAppStore = create<AppStore>()(devtools(persist(immer((set) => ({
  user: null,
  currentProject: null,
  projects: [],
  isLoading: false,
  error: null,
  setUser: (user: User | null) => set((state: AppState) => { state.user = user; }),
  setCurrentProject: (project: Project | null) => set((state: AppState) => { state.currentProject = project; }),
})), { name: 'neoai-app-store' }), { name: 'AppStore' }));

// Editor Store
interface EditorStore extends EditorState {
  openFile: (file: FileNode) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setFileTree: (tree: FileNode[]) => void;
  updateTabContent: (tabId: string, content: string) => void;
  markTabModified: (tabId: string, modified: boolean) => void;
}

export const useEditorStore = create<EditorStore>()(devtools(immer((set) => ({
  tabs: [],
  activeTabId: null,
  fileTree: [],
  isFileTreeOpen: true,
  selectedFileId: null,
  openFile: (file: FileNode) => set((state: EditorState) => {
    if (state.tabs.find((t: EditorTab) => t.path === file.path)) {
      state.activeTabId = file.path;
      return;
    }
    const newTab: EditorTab = { id: file.path, fileId: file.id, name: file.name, path: file.path, content: file.content || '', isActive: true, isModified: false, language: 'typescript' };
    state.tabs.forEach((t: EditorTab) => t.isActive = false);
    state.tabs.push(newTab);
    state.activeTabId = newTab.id;
  }),
  closeTab: (tabId: string) => set((state: EditorState) => {
    state.tabs = state.tabs.filter((t: EditorTab) => t.id !== tabId);
    if (state.activeTabId === tabId && state.tabs.length > 0) {
      state.activeTabId = state.tabs[state.tabs.length - 1].id;
    }
  }),
  setActiveTab: (tabId: string) => set((state: EditorState) => { state.activeTabId = tabId; }),
  setFileTree: (tree: FileNode[]) => set((state: EditorState) => { state.fileTree = tree; }),
  updateTabContent: (tabId: string, content: string) => set((state: EditorState) => {
    const tab = state.tabs.find((t: EditorTab) => t.id === tabId);
    if (tab) {
      tab.content = content;
      tab.isModified = true;
    }
  }),
  markTabModified: (tabId: string, modified: boolean) => set((state: EditorState) => {
    const tab = state.tabs.find((t: EditorTab) => t.id === tabId);
    if (tab) tab.isModified = modified;
  }),
})), { name: 'EditorStore' }));

// AI Store
interface AIStore extends AIState {
  addMessage: (chatId: string, message: AIMessage) => void;
  setActiveChatId: (chatId: string | null) => void;
  addChat: (chat: AIChat) => void;
  setGenerating: (generating: boolean) => void;
}

export const useAIStore = create<AIStore>()(devtools(immer((set) => ({
  chats: [],
  activeChatId: null,
  providers: [],
  selectedModel: 'gpt-4',
  isGenerating: false,
  usage: { tokensUsed: 0, costThisMonth: 0, requestsThisMonth: 0 },
  addMessage: (chatId: string, message: AIMessage) => set((state: AIState) => {
    const chat = state.chats.find((c: AIChat) => c.id === chatId);
    if (chat) chat.messages.push(message);
  }),
  setActiveChatId: (chatId: string | null) => set((state: AIState) => { state.activeChatId = chatId; }),
  addChat: (chat: AIChat) => set((state: AIState) => { state.chats.push(chat); state.activeChatId = chat.id; }),
  setGenerating: (generating: boolean) => set((state: AIState) => { state.isGenerating = generating; }),
})), { name: 'AIStore' }));

// Other stores
const defaultConfig: AppConfig = { theme: 'dark', editor: { fontSize: 14, fontFamily: 'JetBrains Mono', tabSize: 2, wordWrap: true, minimap: true, lineNumbers: true }, ai: { defaultModel: 'gpt-4', autoComplete: true, contextLines: 50, maxTokens: 4096 }, git: { autoCommit: false, commitMessageTemplate: 'feat: {description}', autoPush: false }, preview: { autoReload: true, openInNewTab: false, defaultPort: 3000 } };
export const useConfigStore = create(persist(() => ({ config: defaultConfig }), { name: 'neoai-config-store' }));
export const useGitStore = create(() => ({}));
export const useAgentStore = create(() => ({}));
export const usePreviewStore = create(() => ({}));

