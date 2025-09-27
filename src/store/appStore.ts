import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Global app state
interface AppState {
  // Current project
  currentProjectId: string | null;
  currentProjectName: string | null;
  
  // UI state
  sidebarCollapsed: boolean;
  panelSizes: {
    sidebar: number;
    editor: number;
    preview: number;
  };
  
  // User preferences
  theme: 'dark' | 'light' | 'auto';
  fontSize: number;
  autoSave: boolean;
  
  // Notifications
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface AppActions {
  // Project management
  setCurrentProject: (projectId: string, projectName: string) => void;
  clearCurrentProject: () => void;
  
  // UI actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  updatePanelSize: (panel: keyof AppState['panelSizes'], size: number) => void;
  
  // Preferences
  setTheme: (theme: AppState['theme']) => void;
  setFontSize: (size: number) => void;
  setAutoSave: (enabled: boolean) => void;
  
  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  devtools(
    immer((set) => ({
      // Initial state
      currentProjectId: null,
      currentProjectName: null,
      sidebarCollapsed: false,
      panelSizes: {
        sidebar: 320,
        editor: 800,
        preview: 400,
      },
      theme: 'dark',
      fontSize: 14,
      autoSave: true,
      notifications: [],

      // Actions
      setCurrentProject: (projectId: string, projectName: string) =>
        set((state) => {
          state.currentProjectId = projectId;
          state.currentProjectName = projectName;
        }),

      clearCurrentProject: () =>
        set((state) => {
          state.currentProjectId = null;
          state.currentProjectName = null;
        }),

      toggleSidebar: () =>
        set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed;
        }),

      setSidebarCollapsed: (collapsed: boolean) =>
        set((state) => {
          state.sidebarCollapsed = collapsed;
        }),

      updatePanelSize: (panel: keyof AppState['panelSizes'], size: number) =>
        set((state) => {
          state.panelSizes[panel] = size;
        }),

      setTheme: (theme: AppState['theme']) =>
        set((state) => {
          state.theme = theme;
        }),

      setFontSize: (size: number) =>
        set((state) => {
          state.fontSize = Math.max(10, Math.min(24, size));
        }),

      setAutoSave: (enabled: boolean) =>
        set((state) => {
          state.autoSave = enabled;
        }),

      addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) =>
        set((state) => {
          const newNotification: Notification = {
            ...notification,
            id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            read: false,
          };
          state.notifications.unshift(newNotification);
          
          // Keep only last 50 notifications
          if (state.notifications.length > 50) {
            state.notifications = state.notifications.slice(0, 50);
          }
        }),

      markNotificationRead: (id: string) =>
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification) {
            notification.read = true;
          }
        }),

      removeNotification: (id: string) =>
        set((state) => {
          state.notifications = state.notifications.filter(n => n.id !== id);
        }),

      clearAllNotifications: () =>
        set((state) => {
          state.notifications = [];
        }),
    })),
    { name: 'AppStore' }
  )
);
