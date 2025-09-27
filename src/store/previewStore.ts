import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  PreviewEnvironment,
  PreviewConfig,
  CreatePreviewRequest,
  PreviewMetrics,
} from '@/types/preview';

interface PreviewState {
  // Environments
  environments: PreviewEnvironment[];
  activeEnvironmentId: string | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // WebSocket connection
  wsConnection: WebSocket | null;
  isConnected: boolean;
}

interface PreviewActions {
  // Environment management
  createEnvironment: (projectId: string, config: PreviewConfig) => Promise<PreviewEnvironment>;
  getEnvironment: (environmentId: string) => Promise<PreviewEnvironment>;
  getEnvironments: (projectId: string) => Promise<void>;
  updateEnvironment: (environmentId: string, updates: Partial<PreviewEnvironment>) => Promise<void>;
  deleteEnvironment: (environmentId: string) => Promise<void>;
  
  // Environment control
  startEnvironment: (environmentId: string) => Promise<void>;
  stopEnvironment: (environmentId: string) => Promise<void>;
  restartEnvironment: (environmentId: string) => Promise<void>;
  
  // Logs and metrics
  getEnvironmentLogs: (environmentId: string, lines?: number) => Promise<string[]>;
  getEnvironmentMetrics: (environmentId: string) => Promise<PreviewMetrics>;
  
  // Environment updates
  updateEnvironmentStatus: (environmentId: string, status: PreviewEnvironment['status']) => void;
  addEnvironmentLog: (environmentId: string, log: string) => void;
  
  // WebSocket management
  connectWebSocket: (projectId: string) => void;
  disconnectWebSocket: () => void;
  
  // Utility actions
  setActiveEnvironment: (environmentId: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type PreviewStore = PreviewState & PreviewActions;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8006';

export const usePreviewStore = create<PreviewStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      environments: [],
      activeEnvironmentId: null,
      isLoading: false,
      error: null,
      wsConnection: null,
      isConnected: false,

      // Environment management
      createEnvironment: async (projectId: string, config: PreviewConfig) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const request: CreatePreviewRequest = {
            projectId,
            framework: config.framework,
            buildCommand: config.buildCommand,
            startCommand: config.startCommand,
            installCommand: config.installCommand,
            port: config.port,
            envVars: config.envVars,
          };

          const response = await fetch(`${API_BASE_URL}/api/preview`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify(request),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create preview environment');
          }

          const data = await response.json();
          const environment = data.environment;
          
          set((state) => {
            state.environments.push(environment);
            state.activeEnvironmentId = environment.id;
            state.isLoading = false;
          });

          return environment;
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to create environment';
            state.isLoading = false;
          });
          throw error;
        }
      },

      getEnvironment: async (environmentId: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/preview/${environmentId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to get preview environment');
          }

          const data = await response.json();
          const environment = data.environment;

          set((state) => {
            const index = state.environments.findIndex(env => env.id === environmentId);
            if (index !== -1) {
              state.environments[index] = environment;
            } else {
              state.environments.push(environment);
            }
          });

          return environment;
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to get environment';
          });
          throw error;
        }
      },

      getEnvironments: async (projectId: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await fetch(`${API_BASE_URL}/api/preview?projectId=${projectId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to get preview environments');
          }

          const data = await response.json();
          
          set((state) => {
            state.environments = data.environments || [];
            state.isLoading = false;
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to get environments';
            state.isLoading = false;
          });
        }
      },

      updateEnvironment: async (environmentId: string, updates: Partial<PreviewEnvironment>) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/preview/${environmentId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update environment');
          }

          const data = await response.json();
          
          set((state) => {
            const index = state.environments.findIndex(env => env.id === environmentId);
            if (index !== -1) {
              state.environments[index] = data.environment;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to update environment';
          });
          throw error;
        }
      },

      deleteEnvironment: async (environmentId: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/preview/${environmentId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete environment');
          }

          set((state) => {
            state.environments = state.environments.filter(env => env.id !== environmentId);
            if (state.activeEnvironmentId === environmentId) {
              state.activeEnvironmentId = null;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to delete environment';
          });
          throw error;
        }
      },

      // Environment control
      startEnvironment: async (environmentId: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/preview/${environmentId}/start`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to start environment');
          }

          const data = await response.json();
          
          set((state) => {
            const index = state.environments.findIndex(env => env.id === environmentId);
            if (index !== -1) {
              state.environments[index] = data.environment;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to start environment';
          });
          throw error;
        }
      },

      stopEnvironment: async (environmentId: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/preview/${environmentId}/stop`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to stop environment');
          }

          const data = await response.json();
          
          set((state) => {
            const index = state.environments.findIndex(env => env.id === environmentId);
            if (index !== -1) {
              state.environments[index] = data.environment;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to stop environment';
          });
          throw error;
        }
      },

      restartEnvironment: async (environmentId: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/preview/${environmentId}/restart`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to restart environment');
          }

          const data = await response.json();
          
          set((state) => {
            const index = state.environments.findIndex(env => env.id === environmentId);
            if (index !== -1) {
              state.environments[index] = data.environment;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to restart environment';
          });
          throw error;
        }
      },

      // Logs and metrics
      getEnvironmentLogs: async (environmentId: string, lines = 100) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/preview/${environmentId}/logs?lines=${lines}`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error('Failed to get environment logs');
          }

          const data = await response.json();
          return data.logs || [];
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to get logs';
          });
          throw error;
        }
      },

      getEnvironmentMetrics: async (environmentId: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/preview/${environmentId}/metrics`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to get environment metrics');
          }

          const data = await response.json();
          return data.metrics;
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to get metrics';
          });
          throw error;
        }
      },

      // Environment updates
      updateEnvironmentStatus: (environmentId: string, status: PreviewEnvironment['status']) => {
        set((state) => {
          const environment = state.environments.find(env => env.id === environmentId);
          if (environment) {
            environment.status = status;
            environment.updatedAt = new Date();
          }
        });
      },

      addEnvironmentLog: (environmentId: string, log: string) => {
        set((state) => {
          const environment = state.environments.find(env => env.id === environmentId);
          if (environment) {
            environment.logs.push(log);
            // Keep only last 1000 logs
            if (environment.logs.length > 1000) {
              environment.logs = environment.logs.slice(-1000);
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
          const ws = new WebSocket(`${WS_BASE_URL}/preview/ws/${projectId}`);
          
          ws.onopen = () => {
            set((state) => {
              state.isConnected = true;
            });
            console.log('Preview WebSocket connected');
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              if (data.type === 'environment-update') {
                const environment = data.environment;
                set((state) => {
                  const index = state.environments.findIndex(env => env.id === environment.id);
                  if (index !== -1) {
                    state.environments[index] = environment;
                  }
                });
              } else if (data.type === 'preview-log') {
                get().addEnvironmentLog(data.environmentId, data.log);
              } else if (data.type === 'file-change') {
                // Handle file change notifications
                console.log('File changed:', data.filePath);
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
            console.log('Preview WebSocket disconnected');
          };

          ws.onerror = (error) => {
            console.error('Preview WebSocket error:', error);
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
      setActiveEnvironment: (environmentId: string | null) => {
        set((state) => {
          state.activeEnvironmentId = environmentId;
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
    { name: 'PreviewStore' }
  )
);
