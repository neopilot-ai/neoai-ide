import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  AgentTask,
  AgentStep,
  AgentStatus,
  CreateAgentTaskRequest,
  AgentResponse,
} from '@/types/agent';

interface AgentState {
  // Tasks
  tasks: AgentTask[];
  activeTaskId: string | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // WebSocket connection
  wsConnection: WebSocket | null;
  isConnected: boolean;
}

interface AgentActions {
  // Task management
  createTask: (request: CreateAgentTaskRequest) => Promise<AgentTask>;
  getTask: (taskId: string) => Promise<AgentTask>;
  getTasks: (projectId: string) => Promise<void>;
  cancelTask: (taskId: string) => Promise<void>;
  
  // Task updates
  updateTask: (task: AgentTask) => void;
  updateTaskProgress: (taskId: string, progress: number) => void;
  updateTaskStatus: (taskId: string, status: AgentStatus) => void;
  updateStep: (taskId: string, stepId: string, updates: Partial<AgentStep>) => void;
  
  // WebSocket management
  connectWebSocket: (projectId: string) => void;
  disconnectWebSocket: () => void;
  
  // Utility actions
  setActiveTask: (taskId: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AgentStore = AgentState & AgentActions;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8004';

export const useAgentStore = create<AgentStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      tasks: [],
      activeTaskId: null,
      isLoading: false,
      error: null,
      wsConnection: null,
      isConnected: false,

      // Task management
      createTask: async (request: CreateAgentTaskRequest) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await fetch(`${API_BASE_URL}/api/agents/tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify(request),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create agent task');
          }

          const data: AgentResponse = await response.json();
          
          set((state) => {
            state.tasks.unshift(data.task);
            state.activeTaskId = data.task.id;
            state.isLoading = false;
          });

          return data.task;
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to create task';
            state.isLoading = false;
          });
          throw error;
        }
      },

      getTask: async (taskId: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/agents/tasks/${taskId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to get agent task');
          }

          const data = await response.json();
          const task = data.task;

          set((state) => {
            const index = state.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
              state.tasks[index] = task;
            } else {
              state.tasks.push(task);
            }
          });

          return task;
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to get task';
          });
          throw error;
        }
      },

      getTasks: async (projectId: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          // For now, we'll filter tasks by projectId on the client side
          // In a real implementation, the API would support filtering
          const response = await fetch(`${API_BASE_URL}/api/agents/tasks?projectId=${projectId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to get agent tasks');
          }

          const data = await response.json();
          
          set((state) => {
            state.tasks = data.tasks || [];
            state.isLoading = false;
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to get tasks';
            state.isLoading = false;
          });
        }
      },

      cancelTask: async (taskId: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/agents/tasks/${taskId}/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to cancel task');
          }

          const data = await response.json();
          
          set((state) => {
            const index = state.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
              state.tasks[index] = data.task;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to cancel task';
          });
          throw error;
        }
      },

      // Task updates
      updateTask: (task: AgentTask) => {
        set((state) => {
          const index = state.tasks.findIndex(t => t.id === task.id);
          if (index !== -1) {
            state.tasks[index] = task;
          } else {
            state.tasks.push(task);
          }
        });
      },

      updateTaskProgress: (taskId: string, progress: number) => {
        set((state) => {
          const task = state.tasks.find(t => t.id === taskId);
          if (task) {
            task.progress = progress;
          }
        });
      },

      updateTaskStatus: (taskId: string, status: AgentStatus) => {
        set((state) => {
          const task = state.tasks.find(t => t.id === taskId);
          if (task) {
            task.status = status;
            if (status === AgentStatus.COMPLETED || status === AgentStatus.FAILED) {
              task.completedAt = new Date();
              if (task.startedAt) {
                task.duration = (task.completedAt.getTime() - task.startedAt.getTime()) / 1000;
              }
            }
          }
        });
      },

      updateStep: (taskId: string, stepId: string, updates: Partial<AgentStep>) => {
        set((state) => {
          const task = state.tasks.find(t => t.id === taskId);
          if (task) {
            const step = task.steps.find(s => s.id === stepId);
            if (step) {
              Object.assign(step, updates);
            }
          }
        });
      },

      // WebSocket management
      connectWebSocket: (projectId: string) => {
        const { wsConnection, disconnectWebSocket } = get();
        
        // Close existing connection
        if (wsConnection) {
          disconnectWebSocket();
        }

        try {
          const ws = new WebSocket(`${WS_BASE_URL}/agents/ws/${projectId}`);
          
          ws.onopen = () => {
            set((state) => {
              state.isConnected = true;
            });
            console.log('Agent WebSocket connected');
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              if (data.type === 'agent_update') {
                get().updateTask(data.task);
              }
            } catch (error) {
              console.error('Failed to parse WebSocket message:', error);
            }
          };

          ws.onclose = () => {
            set((state) => {
              state.isConnected = false;
              state.wsConnection = null;
            });
            console.log('Agent WebSocket disconnected');
          };

          ws.onerror = (error) => {
            console.error('Agent WebSocket error:', error);
            set((state) => {
              state.error = 'WebSocket connection error';
            });
          };

          set((state) => {
            state.wsConnection = ws;
          });
        } catch (error) {
          console.error('Failed to connect to WebSocket:', error);
          set((state) => {
            state.error = 'Failed to connect to real-time updates';
          });
        }
      },

      disconnectWebSocket: () => {
        const { wsConnection } = get();
        
        if (wsConnection) {
          wsConnection.close();
          set((state) => {
            state.wsConnection = null;
            state.isConnected = false;
          });
        }
      },

      // Utility actions
      setActiveTask: (taskId: string | null) => {
        set((state) => {
          state.activeTaskId = taskId;
        });
      },

      setError: (error: string | null) => {
        set((state) => {
          state.error = error;
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      setLoading: (loading: boolean) => {
        set((state) => {
          state.isLoading = loading;
        });
      },
    })),
    { name: 'AgentStore' }
  )
);
