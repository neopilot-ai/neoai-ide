import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  GitRepository,
  GitCommit,
  GitBranch,
  GitStatus,
  GitCommitRequest,
  GitCloneRequest,
  GitCreateBranchRequest,
} from '@/types/git';

interface GitState {
  // Current repository state
  repository: GitRepository | null;
  branches: GitBranch[];
  commits: GitCommit[];
  status: GitStatus | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Settings
  defaultAuthor: {
    name: string;
    email: string;
  };
}

interface GitActions {
  // Repository management
  initializeRepository: (projectId: string) => Promise<void>;
  cloneRepository: (url: string, projectId: string, branch?: string) => Promise<void>;
  
  // Status and info
  getStatus: (projectId: string) => Promise<void>;
  getRepositoryInfo: (projectId: string) => Promise<void>;
  
  // Branch operations
  getBranches: (projectId: string) => Promise<void>;
  createBranch: (projectId: string, name: string, from?: string) => Promise<void>;
  switchBranch: (projectId: string, branchName: string) => Promise<void>;
  deleteBranch: (projectId: string, branchName: string) => Promise<void>;
  
  // Commit operations
  getCommits: (projectId: string, limit?: number) => Promise<void>;
  commitChanges: (projectId: string, commitData: GitCommitRequest) => Promise<void>;
  
  // Remote operations
  pushChanges: (projectId: string, remote?: string, branch?: string) => Promise<void>;
  pullChanges: (projectId: string, remote?: string, branch?: string) => Promise<void>;
  
  // Utility actions
  setError: (error: string | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  setDefaultAuthor: (name: string, email: string) => void;
}

type GitStore = GitState & GitActions;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useGitStore = create<GitStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      repository: null,
      branches: [],
      commits: [],
      status: null,
      isLoading: false,
      error: null,
      defaultAuthor: {
        name: '',
        email: '',
      },

      // Repository management
      initializeRepository: async (projectId: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await fetch(`${API_BASE_URL}/api/git/${projectId}/info`);
          
          if (!response.ok) {
            throw new Error('Repository not found or not initialized');
          }

          const data = await response.json();
          
          set((state) => {
            state.repository = data.repository;
            state.isLoading = false;
          });

          // Load additional data
          await Promise.all([
            get().getStatus(projectId),
            get().getBranches(projectId),
            get().getCommits(projectId),
          ]);
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to initialize repository';
            state.isLoading = false;
          });
        }
      },

      cloneRepository: async (url: string, projectId: string, branch?: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const cloneData: GitCloneRequest = {
            url,
            projectId,
            branch,
          };

          const response = await fetch(`${API_BASE_URL}/api/git/clone`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(cloneData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to clone repository');
          }

          const data = await response.json();
          
          set((state) => {
            state.repository = data.repository;
            state.isLoading = false;
          });

          // Load additional data
          await Promise.all([
            get().getStatus(projectId),
            get().getBranches(projectId),
            get().getCommits(projectId),
          ]);
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to clone repository';
            state.isLoading = false;
          });
          throw error;
        }
      },

      // Status and info
      getStatus: async (projectId: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/git/${projectId}/status`);
          
          if (!response.ok) {
            throw new Error('Failed to get repository status');
          }

          const data = await response.json();
          
          set((state) => {
            state.status = data.status;
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to get status';
          });
        }
      },

      getRepositoryInfo: async (projectId: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/git/${projectId}/info`);
          
          if (!response.ok) {
            throw new Error('Failed to get repository info');
          }

          const data = await response.json();
          
          set((state) => {
            state.repository = data.repository;
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to get repository info';
          });
        }
      },

      // Branch operations
      getBranches: async (projectId: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/git/${projectId}/branches`);
          
          if (!response.ok) {
            throw new Error('Failed to get branches');
          }

          const data = await response.json();
          
          set((state) => {
            state.branches = data.branches || [];
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to get branches';
          });
        }
      },

      createBranch: async (projectId: string, name: string, from?: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const branchData: GitCreateBranchRequest = {
            name,
            from,
          };

          const response = await fetch(`${API_BASE_URL}/api/git/${projectId}/branches`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(branchData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create branch');
          }

          set((state) => {
            state.isLoading = false;
          });

          // Refresh branches
          await get().getBranches(projectId);
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to create branch';
            state.isLoading = false;
          });
          throw error;
        }
      },

      switchBranch: async (projectId: string, branchName: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await fetch(
            `${API_BASE_URL}/api/git/${projectId}/branches/${branchName}/checkout`,
            {
              method: 'POST',
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to switch branch');
          }

          set((state) => {
            state.isLoading = false;
            if (state.repository) {
              state.repository.branch = branchName;
            }
          });

          // Refresh data
          await Promise.all([
            get().getBranches(projectId),
            get().getStatus(projectId),
            get().getCommits(projectId),
          ]);
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to switch branch';
            state.isLoading = false;
          });
          throw error;
        }
      },

      deleteBranch: async () => {
        // TODO: Implement branch deletion
        console.log('Delete branch not implemented yet');
      },

      // Commit operations
      getCommits: async (projectId: string, limit = 50) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/git/${projectId}/history?limit=${limit}`
          );
          
          if (!response.ok) {
            throw new Error('Failed to get commit history');
          }

          const data = await response.json();
          
          set((state) => {
            state.commits = data.commits || [];
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to get commits';
          });
        }
      },

      commitChanges: async (projectId: string, commitData: GitCommitRequest) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await fetch(`${API_BASE_URL}/api/git/${projectId}/commit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(commitData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to commit changes');
          }

          const data = await response.json();
          
          set((state) => {
            state.isLoading = false;
            // Add new commit to the beginning of the list
            if (data.commit) {
              state.commits.unshift(data.commit);
            }
          });

          // Refresh status
          await get().getStatus(projectId);
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to commit changes';
            state.isLoading = false;
          });
          throw error;
        }
      },

      // Remote operations
      pushChanges: async (projectId: string, remote = 'origin', branch?: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const pushData = {
            remote,
            branch,
          };

          const response = await fetch(`${API_BASE_URL}/api/git/${projectId}/push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(pushData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to push changes');
          }

          set((state) => {
            state.isLoading = false;
          });

          // Refresh status and branches
          await Promise.all([
            get().getStatus(projectId),
            get().getBranches(projectId),
          ]);
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to push changes';
            state.isLoading = false;
          });
          throw error;
        }
      },

      pullChanges: async (projectId: string) => {
        // TODO: Implement pull operation
        console.log('Pull changes not implemented yet');
      },

      // Utility actions
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

      setDefaultAuthor: (name: string, email: string) => {
        set((state) => {
          state.defaultAuthor = { name, email };
        });
      },
    })),
    { name: 'GitStore' }
  )
);
