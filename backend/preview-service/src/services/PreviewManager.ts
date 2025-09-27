import { Server as SocketIOServer } from 'socket.io';
import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import chokidar from 'chokidar';
import { logger } from '../utils/logger';

export interface PreviewEnvironment {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  framework: string;
  status: 'starting' | 'running' | 'stopped' | 'error' | 'building';
  url?: string;
  port: number;
  containerId?: string;
  buildCommand?: string;
  startCommand?: string;
  envVars: Record<string, string>;
  logs: string[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessed?: Date;
}

export interface PreviewConfig {
  framework: string;
  buildCommand?: string;
  startCommand?: string;
  installCommand?: string;
  port?: number;
  envVars?: Record<string, string>;
  dockerfile?: string;
}

export class PreviewManager {
  private docker: Docker;
  private environments: Map<string, PreviewEnvironment> = new Map();
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private portPool: Set<number> = new Set();
  private readonly basePort = 3000;
  private readonly maxPort = 4000;

  constructor(private io: SocketIOServer) {
    this.docker = new Docker();
    this.initializePortPool();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Preview Manager...');
    
    try {
      // Check Docker availability
      await this.docker.ping();
      logger.info('✅ Docker connection established');
      
      // Cleanup any orphaned containers
      await this.cleanupOrphanedContainers();
      
      logger.info('✅ Preview Manager initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Preview Manager:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Preview Manager...');
    
    try {
      // Stop all environments
      for (const [envId, env] of this.environments) {
        await this.stopEnvironment(envId);
      }
      
      // Close all file watchers
      for (const [projectId, watcher] of this.watchers) {
        await watcher.close();
      }
      
      this.environments.clear();
      this.watchers.clear();
      
      logger.info('✅ Preview Manager cleaned up');
    } catch (error) {
      logger.error('❌ Error during Preview Manager cleanup:', error);
    }
  }

  async createEnvironment(
    projectId: string,
    userId: string,
    config: PreviewConfig
  ): Promise<PreviewEnvironment> {
    const envId = uuidv4();
    const port = this.allocatePort();
    
    if (!port) {
      throw new Error('No available ports for preview environment');
    }

    const environment: PreviewEnvironment = {
      id: envId,
      projectId,
      userId,
      name: `${config.framework}-preview`,
      framework: config.framework,
      status: 'starting',
      port,
      buildCommand: config.buildCommand,
      startCommand: config.startCommand,
      envVars: config.envVars || {},
      logs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.environments.set(envId, environment);

    try {
      // Start the environment
      await this.startEnvironment(envId, config);
      
      // Setup file watching for hot reload
      await this.setupFileWatching(projectId, envId);
      
      logger.info(`Preview environment created: ${envId} for project ${projectId}`);
      
      return environment;
    } catch (error) {
      this.environments.delete(envId);
      this.releasePort(port);
      throw error;
    }
  }

  async startEnvironment(envId: string, config: PreviewConfig): Promise<void> {
    const environment = this.environments.get(envId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    try {
      environment.status = 'building';
      this.updateEnvironment(environment);

      // Get project path
      const projectPath = this.getProjectPath(environment.projectId);
      
      // Create container configuration
      const containerConfig = await this.createContainerConfig(environment, config, projectPath);
      
      // Create and start container
      const container = await this.docker.createContainer(containerConfig);
      await container.start();
      
      environment.containerId = container.id;
      environment.status = 'running';
      environment.url = `http://localhost:${environment.port}`;
      environment.updatedAt = new Date();
      
      this.updateEnvironment(environment);
      
      // Start log streaming
      this.startLogStreaming(environment, container);
      
      logger.info(`Environment ${envId} started successfully`);
    } catch (error) {
      environment.status = 'error';
      environment.logs.push(`Error starting environment: ${error}`);
      this.updateEnvironment(environment);
      
      logger.error(`Failed to start environment ${envId}:`, error);
      throw error;
    }
  }

  async stopEnvironment(envId: string): Promise<void> {
    const environment = this.environments.get(envId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    try {
      if (environment.containerId) {
        const container = this.docker.getContainer(environment.containerId);
        await container.stop();
        await container.remove();
      }

      environment.status = 'stopped';
      environment.containerId = undefined;
      environment.url = undefined;
      environment.updatedAt = new Date();
      
      this.releasePort(environment.port);
      this.updateEnvironment(environment);
      
      // Stop file watching
      const watcher = this.watchers.get(environment.projectId);
      if (watcher) {
        await watcher.close();
        this.watchers.delete(environment.projectId);
      }
      
      logger.info(`Environment ${envId} stopped successfully`);
    } catch (error) {
      logger.error(`Failed to stop environment ${envId}:`, error);
      throw error;
    }
  }

  async restartEnvironment(envId: string): Promise<void> {
    const environment = this.environments.get(envId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    await this.stopEnvironment(envId);
    
    // Recreate config from environment
    const config: PreviewConfig = {
      framework: environment.framework,
      buildCommand: environment.buildCommand,
      startCommand: environment.startCommand,
      envVars: environment.envVars,
    };
    
    await this.startEnvironment(envId, config);
  }

  async getEnvironment(envId: string): Promise<PreviewEnvironment | undefined> {
    return this.environments.get(envId);
  }

  async getEnvironmentsByProject(projectId: string): Promise<PreviewEnvironment[]> {
    return Array.from(this.environments.values()).filter(
      env => env.projectId === projectId
    );
  }

  async getEnvironmentsByUser(userId: string): Promise<PreviewEnvironment[]> {
    return Array.from(this.environments.values()).filter(
      env => env.userId === userId
    );
  }

  private async createContainerConfig(
    environment: PreviewEnvironment,
    config: PreviewConfig,
    projectPath: string
  ): Promise<any> {
    const frameworkConfigs = {
      react: {
        image: 'node:18-alpine',
        cmd: ['sh', '-c', `${config.installCommand || 'npm install'} && ${config.startCommand || 'npm start'}`],
        workingDir: '/app',
        exposedPorts: { [`${environment.port}/tcp`]: {} },
        env: [
          'NODE_ENV=development',
          `PORT=${environment.port}`,
          'CHOKIDAR_USEPOLLING=true',
          ...Object.entries(environment.envVars).map(([key, value]) => `${key}=${value}`),
        ],
      },
      vue: {
        image: 'node:18-alpine',
        cmd: ['sh', '-c', `${config.installCommand || 'npm install'} && ${config.startCommand || 'npm run dev'}`],
        workingDir: '/app',
        exposedPorts: { [`${environment.port}/tcp`]: {} },
        env: [
          'NODE_ENV=development',
          `PORT=${environment.port}`,
          ...Object.entries(environment.envVars).map(([key, value]) => `${key}=${value}`),
        ],
      },
      nextjs: {
        image: 'node:18-alpine',
        cmd: ['sh', '-c', `${config.installCommand || 'npm install'} && ${config.startCommand || 'npm run dev'}`],
        workingDir: '/app',
        exposedPorts: { [`${environment.port}/tcp`]: {} },
        env: [
          'NODE_ENV=development',
          `PORT=${environment.port}`,
          ...Object.entries(environment.envVars).map(([key, value]) => `${key}=${value}`),
        ],
      },
      express: {
        image: 'node:18-alpine',
        cmd: ['sh', '-c', `${config.installCommand || 'npm install'} && ${config.startCommand || 'npm start'}`],
        workingDir: '/app',
        exposedPorts: { [`${environment.port}/tcp`]: {} },
        env: [
          'NODE_ENV=development',
          `PORT=${environment.port}`,
          ...Object.entries(environment.envVars).map(([key, value]) => `${key}=${value}`),
        ],
      },
      python: {
        image: 'python:3.11-alpine',
        cmd: ['sh', '-c', `${config.installCommand || 'pip install -r requirements.txt'} && ${config.startCommand || 'python app.py'}`],
        workingDir: '/app',
        exposedPorts: { [`${environment.port}/tcp`]: {} },
        env: [
          `PORT=${environment.port}`,
          'PYTHONUNBUFFERED=1',
          ...Object.entries(environment.envVars).map(([key, value]) => `${key}=${value}`),
        ],
      },
    };

    const frameworkConfig = frameworkConfigs[environment.framework as keyof typeof frameworkConfigs] || frameworkConfigs.react;

    return {
      Image: frameworkConfig.image,
      Cmd: frameworkConfig.cmd,
      WorkingDir: frameworkConfig.workingDir,
      Env: frameworkConfig.env,
      ExposedPorts: frameworkConfig.exposedPorts,
      HostConfig: {
        PortBindings: {
          [`${environment.port}/tcp`]: [{ HostPort: environment.port.toString() }],
        },
        Binds: [`${projectPath}:${frameworkConfig.workingDir}`],
        AutoRemove: true,
      },
      NetworkMode: 'bridge',
      Labels: {
        'neoai.service': 'preview',
        'neoai.environment': environment.id,
        'neoai.project': environment.projectId,
        'neoai.user': environment.userId,
      },
    };
  }

  private async setupFileWatching(projectId: string, envId: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    
    try {
      await fs.access(projectPath);
    } catch {
      logger.warn(`Project path not found: ${projectPath}`);
      return;
    }

    const watcher = chokidar.watch(projectPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('change', (filePath) => {
      this.handleFileChange(envId, filePath, 'change');
    });

    watcher.on('add', (filePath) => {
      this.handleFileChange(envId, filePath, 'add');
    });

    watcher.on('unlink', (filePath) => {
      this.handleFileChange(envId, filePath, 'delete');
    });

    this.watchers.set(projectId, watcher);
    logger.info(`File watching setup for project ${projectId}`);
  }

  private handleFileChange(envId: string, filePath: string, changeType: string): void {
    const environment = this.environments.get(envId);
    if (!environment) return;

    const logMessage = `File ${changeType}: ${path.basename(filePath)}`;
    environment.logs.push(logMessage);
    
    // Emit file change event to connected clients
    this.io.to(`project:${environment.projectId}`).emit('file-change', {
      environmentId: envId,
      filePath,
      changeType,
      timestamp: new Date(),
    });

    // Update environment
    this.updateEnvironment(environment);
  }

  private async startLogStreaming(environment: PreviewEnvironment, container: Docker.Container): Promise<void> {
    try {
      const stream = await container.logs({
        stdout: true,
        stderr: true,
        follow: true,
        timestamps: true,
      });

      stream.on('data', (chunk) => {
        const logLine = chunk.toString().trim();
        if (logLine) {
          environment.logs.push(logLine);
          
          // Keep only last 1000 log lines
          if (environment.logs.length > 1000) {
            environment.logs = environment.logs.slice(-1000);
          }
          
          // Emit log to connected clients
          this.io.to(`project:${environment.projectId}`).emit('preview-log', {
            environmentId: environment.id,
            log: logLine,
            timestamp: new Date(),
          });
        }
      });

      stream.on('error', (error) => {
        logger.error(`Log streaming error for environment ${environment.id}:`, error);
      });
    } catch (error) {
      logger.error(`Failed to start log streaming for environment ${environment.id}:`, error);
    }
  }

  private updateEnvironment(environment: PreviewEnvironment): void {
    environment.updatedAt = new Date();
    
    // Emit environment update to connected clients
    this.io.to(`project:${environment.projectId}`).emit('environment-update', environment);
  }

  private initializePortPool(): void {
    for (let port = this.basePort; port <= this.maxPort; port++) {
      this.portPool.add(port);
    }
  }

  private allocatePort(): number | null {
    const availablePorts = Array.from(this.portPool);
    if (availablePorts.length === 0) {
      return null;
    }
    
    const port = availablePorts[0];
    this.portPool.delete(port);
    return port;
  }

  private releasePort(port: number): void {
    this.portPool.add(port);
  }

  private getProjectPath(projectId: string): string {
    const workspaceDir = process.env.WORKSPACE_DIR || '/tmp/neoai-workspaces';
    return path.join(workspaceDir, projectId);
  }

  private async cleanupOrphanedContainers(): Promise<void> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: ['neoai.service=preview'],
        },
      });

      for (const containerInfo of containers) {
        try {
          const container = this.docker.getContainer(containerInfo.Id);
          await container.stop();
          await container.remove();
          logger.info(`Cleaned up orphaned container: ${containerInfo.Id}`);
        } catch (error) {
          logger.warn(`Failed to cleanup container ${containerInfo.Id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup orphaned containers:', error);
    }
  }
}
