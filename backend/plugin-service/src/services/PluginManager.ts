import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as tar from 'tar';
import * as semver from 'semver';
import { VM } from 'vm2';
import { logger } from '../utils/logger';

export interface Plugin {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: PluginAuthor;
  category: PluginCategory;
  tags: string[];
  icon?: string;
  screenshots: string[];
  homepage?: string;
  repository?: string;
  license: string;
  engines: {
    neoai: string;
    node?: string;
  };
  main: string;
  contributes: PluginContributions;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  activationEvents: string[];
  extensionDependencies?: string[];
  extensionPack?: string[];
  pricing: PluginPricing;
  status: PluginStatus;
  security: PluginSecurity;
  metrics: PluginMetrics;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface PluginAuthor {
  id: string;
  name: string;
  email: string;
  url?: string;
  avatar?: string;
  verified: boolean;
}

export enum PluginCategory {
  THEMES = 'themes',
  LANGUAGES = 'languages',
  DEBUGGERS = 'debuggers',
  FORMATTERS = 'formatters',
  LINTERS = 'linters',
  SNIPPETS = 'snippets',
  KEYMAPS = 'keymaps',
  AI_TOOLS = 'ai-tools',
  PRODUCTIVITY = 'productivity',
  COLLABORATION = 'collaboration',
  DEPLOYMENT = 'deployment',
  TESTING = 'testing',
  VISUALIZATION = 'visualization',
  OTHER = 'other',
}

export enum PluginStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  DEPRECATED = 'deprecated',
  SUSPENDED = 'suspended',
}

export interface PluginContributions {
  commands?: PluginCommand[];
  menus?: PluginMenu[];
  keybindings?: PluginKeybinding[];
  languages?: PluginLanguage[];
  grammars?: PluginGrammar[];
  themes?: PluginTheme[];
  snippets?: PluginSnippet[];
  debuggers?: PluginDebugger[];
  configuration?: PluginConfiguration;
  views?: PluginView[];
  viewsContainers?: PluginViewContainer[];
  problemMatchers?: PluginProblemMatcher[];
  taskDefinitions?: PluginTaskDefinition[];
}

export interface PluginCommand {
  command: string;
  title: string;
  category?: string;
  icon?: string;
  enablement?: string;
}

export interface PluginMenu {
  commandPalette?: PluginMenuItem[];
  editor?: PluginMenuItem[];
  explorer?: PluginMenuItem[];
  scm?: PluginMenuItem[];
}

export interface PluginMenuItem {
  command: string;
  when?: string;
  group?: string;
  alt?: string;
}

export interface PluginKeybinding {
  command: string;
  key: string;
  mac?: string;
  linux?: string;
  win?: string;
  when?: string;
}

export interface PluginLanguage {
  id: string;
  aliases?: string[];
  extensions?: string[];
  filenames?: string[];
  firstLine?: string;
  configuration?: string;
}

export interface PluginGrammar {
  language: string;
  scopeName: string;
  path: string;
  embeddedLanguages?: Record<string, string>;
  tokenTypes?: Record<string, string>;
}

export interface PluginTheme {
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
  path: string;
}

export interface PluginSnippet {
  language: string;
  path: string;
}

export interface PluginDebugger {
  type: string;
  label: string;
  program?: string;
  runtime?: string;
  configurationAttributes?: Record<string, any>;
  initialConfigurations?: any[];
  configurationSnippets?: any[];
}

export interface PluginConfiguration {
  title: string;
  properties: Record<string, PluginConfigProperty>;
}

export interface PluginConfigProperty {
  type: string;
  default?: any;
  description?: string;
  enum?: any[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
}

export interface PluginView {
  id: string;
  name: string;
  when?: string;
  icon?: string;
  contextualTitle?: string;
}

export interface PluginViewContainer {
  id: string;
  title: string;
  icon: string;
}

export interface PluginProblemMatcher {
  name: string;
  owner: string;
  fileLocation?: string;
  pattern: PluginProblemPattern | PluginProblemPattern[];
}

export interface PluginProblemPattern {
  regexp: string;
  file?: number;
  line?: number;
  column?: number;
  severity?: number;
  message?: number;
  code?: number;
  location?: number;
  loop?: boolean;
}

export interface PluginTaskDefinition {
  type: string;
  required?: string[];
  properties?: Record<string, any>;
}

export interface PluginPricing {
  type: 'free' | 'paid' | 'freemium';
  price?: number;
  currency?: string;
  billingPeriod?: 'monthly' | 'yearly' | 'one-time';
  trialDays?: number;
}

export interface PluginSecurity {
  scanned: boolean;
  scanDate?: Date;
  vulnerabilities: PluginVulnerability[];
  permissions: string[];
  sandboxed: boolean;
  trustedPublisher: boolean;
}

export interface PluginVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  cve?: string;
  fixedVersion?: string;
}

export interface PluginMetrics {
  downloads: number;
  weeklyDownloads: number;
  rating: number;
  ratingCount: number;
  reviews: number;
  lastUpdated: Date;
  size: number;
  installCount: number;
  activeInstalls: number;
}

export interface PluginInstallation {
  id: string;
  pluginId: string;
  userId: string;
  version: string;
  installedAt: Date;
  enabled: boolean;
  settings?: Record<string, any>;
}

export interface PluginRuntime {
  id: string;
  pluginId: string;
  instance: any;
  context: PluginContext;
  vm?: VM;
  active: boolean;
  startedAt: Date;
}

export interface PluginContext {
  subscriptions: any[];
  globalState: any;
  workspaceState: any;
  extensionPath: string;
  storagePath: string;
  globalStoragePath: string;
  logPath: string;
  extensionUri: string;
  environmentVariableCollection: any;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private installations: Map<string, PluginInstallation> = new Map(); // userId:pluginId -> installation
  private runtimes: Map<string, PluginRuntime> = new Map(); // pluginId -> runtime
  private pluginDirectory: string;

  constructor() {
    this.pluginDirectory = process.env.PLUGIN_DIRECTORY || '/tmp/neoai-plugins';
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Plugin Manager...');
    
    try {
      // Ensure plugin directory exists
      await fs.mkdir(this.pluginDirectory, { recursive: true });
      
      // Load installed plugins
      await this.loadInstalledPlugins();
      
      logger.info('✅ Plugin Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize Plugin Manager:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Plugin Manager...');
    
    // Stop all running plugins
    for (const [pluginId, runtime] of this.runtimes) {
      await this.stopPlugin(pluginId);
    }
    
    this.plugins.clear();
    this.installations.clear();
    this.runtimes.clear();
    
    logger.info('✅ Plugin Manager cleaned up');
  }

  async installPlugin(pluginId: string, userId: string, version?: string): Promise<PluginInstallation> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      const installVersion = version || plugin.version;
      
      // Check if already installed
      const installationKey = `${userId}:${pluginId}`;
      const existingInstallation = this.installations.get(installationKey);
      
      if (existingInstallation) {
        // Update to new version if different
        if (existingInstallation.version !== installVersion) {
          existingInstallation.version = installVersion;
          existingInstallation.installedAt = new Date();
          
          // Restart plugin if running
          if (this.runtimes.has(pluginId)) {
            await this.restartPlugin(pluginId);
          }
        }
        return existingInstallation;
      }

      // Create new installation
      const installation: PluginInstallation = {
        id: uuidv4(),
        pluginId,
        userId,
        version: installVersion,
        installedAt: new Date(),
        enabled: true,
      };

      this.installations.set(installationKey, installation);

      // Download and extract plugin files
      await this.downloadPlugin(pluginId, installVersion);

      // Update plugin metrics
      plugin.metrics.downloads++;
      plugin.metrics.installCount++;
      plugin.metrics.activeInstalls++;

      logger.info(`Plugin ${pluginId} installed for user ${userId}`);
      return installation;
    } catch (error) {
      logger.error(`Error installing plugin ${pluginId}:`, error);
      throw error;
    }
  }

  async uninstallPlugin(pluginId: string, userId: string): Promise<boolean> {
    try {
      const installationKey = `${userId}:${pluginId}`;
      const installation = this.installations.get(installationKey);
      
      if (!installation) {
        return false;
      }

      // Stop plugin if running
      if (this.runtimes.has(pluginId)) {
        await this.stopPlugin(pluginId);
      }

      // Remove installation
      this.installations.delete(installationKey);

      // Update plugin metrics
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        plugin.metrics.activeInstalls = Math.max(0, plugin.metrics.activeInstalls - 1);
      }

      // Clean up plugin files for this user
      await this.cleanupPluginFiles(pluginId, userId);

      logger.info(`Plugin ${pluginId} uninstalled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error uninstalling plugin ${pluginId}:`, error);
      return false;
    }
  }

  async enablePlugin(pluginId: string, userId: string): Promise<boolean> {
    try {
      const installationKey = `${userId}:${pluginId}`;
      const installation = this.installations.get(installationKey);
      
      if (!installation) {
        return false;
      }

      installation.enabled = true;
      
      // Start plugin
      await this.startPlugin(pluginId);

      logger.info(`Plugin ${pluginId} enabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error enabling plugin ${pluginId}:`, error);
      return false;
    }
  }

  async disablePlugin(pluginId: string, userId: string): Promise<boolean> {
    try {
      const installationKey = `${userId}:${pluginId}`;
      const installation = this.installations.get(installationKey);
      
      if (!installation) {
        return false;
      }

      installation.enabled = false;
      
      // Stop plugin
      await this.stopPlugin(pluginId);

      logger.info(`Plugin ${pluginId} disabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error disabling plugin ${pluginId}:`, error);
      return false;
    }
  }

  async startPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        return false;
      }

      // Check if already running
      if (this.runtimes.has(pluginId)) {
        return true;
      }

      // Create plugin context
      const context = this.createPluginContext(plugin);

      // Create sandbox VM
      const vm = new VM({
        timeout: 30000, // 30 seconds
        sandbox: {
          console: {
            log: (...args: any[]) => logger.info(`[Plugin ${pluginId}]`, ...args),
            error: (...args: any[]) => logger.error(`[Plugin ${pluginId}]`, ...args),
            warn: (...args: any[]) => logger.warn(`[Plugin ${pluginId}]`, ...args),
          },
          require: this.createRequireFunction(plugin),
          exports: {},
          module: { exports: {} },
          __dirname: path.join(this.pluginDirectory, pluginId),
          __filename: path.join(this.pluginDirectory, pluginId, plugin.main),
        },
      });

      // Load plugin code
      const pluginPath = path.join(this.pluginDirectory, pluginId, plugin.main);
      const pluginCode = await fs.readFile(pluginPath, 'utf-8');

      // Execute plugin
      const instance = vm.run(pluginCode);

      // Create runtime
      const runtime: PluginRuntime = {
        id: uuidv4(),
        pluginId,
        instance,
        context,
        vm,
        active: true,
        startedAt: new Date(),
      };

      this.runtimes.set(pluginId, runtime);

      // Call plugin activation
      if (instance && typeof instance.activate === 'function') {
        await instance.activate(context);
      }

      logger.info(`Plugin ${pluginId} started successfully`);
      return true;
    } catch (error) {
      logger.error(`Error starting plugin ${pluginId}:`, error);
      return false;
    }
  }

  async stopPlugin(pluginId: string): Promise<boolean> {
    try {
      const runtime = this.runtimes.get(pluginId);
      if (!runtime) {
        return false;
      }

      // Call plugin deactivation
      if (runtime.instance && typeof runtime.instance.deactivate === 'function') {
        await runtime.instance.deactivate();
      }

      // Clean up subscriptions
      if (runtime.context.subscriptions) {
        for (const subscription of runtime.context.subscriptions) {
          if (subscription && typeof subscription.dispose === 'function') {
            subscription.dispose();
          }
        }
      }

      // Remove runtime
      this.runtimes.delete(pluginId);

      logger.info(`Plugin ${pluginId} stopped successfully`);
      return true;
    } catch (error) {
      logger.error(`Error stopping plugin ${pluginId}:`, error);
      return false;
    }
  }

  async restartPlugin(pluginId: string): Promise<boolean> {
    await this.stopPlugin(pluginId);
    return this.startPlugin(pluginId);
  }

  async getPlugin(pluginId: string): Promise<Plugin | null> {
    return this.plugins.get(pluginId) || null;
  }

  async getUserInstallations(userId: string): Promise<PluginInstallation[]> {
    return Array.from(this.installations.values())
      .filter(installation => installation.userId === userId);
  }

  async searchPlugins(query: string, category?: PluginCategory, limit = 20): Promise<Plugin[]> {
    const results: Plugin[] = [];
    const searchTerms = query.toLowerCase().split(' ');

    for (const plugin of this.plugins.values()) {
      if (plugin.status !== PluginStatus.PUBLISHED) {
        continue;
      }

      if (category && plugin.category !== category) {
        continue;
      }

      // Calculate relevance score
      let score = 0;
      const searchableText = [
        plugin.name,
        plugin.displayName,
        plugin.description,
        plugin.author.name,
        ...plugin.tags,
      ].join(' ').toLowerCase();

      for (const term of searchTerms) {
        if (searchableText.includes(term)) {
          score++;
        }
      }

      if (score > 0) {
        results.push(plugin);
      }

      if (results.length >= limit) {
        break;
      }
    }

    // Sort by relevance and popularity
    return results.sort((a, b) => {
      const scoreA = this.calculatePopularityScore(a);
      const scoreB = this.calculatePopularityScore(b);
      return scoreB - scoreA;
    });
  }

  private async loadInstalledPlugins(): Promise<void> {
    try {
      const pluginDirs = await fs.readdir(this.pluginDirectory);
      
      for (const dir of pluginDirs) {
        try {
          const manifestPath = path.join(this.pluginDirectory, dir, 'package.json');
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);
          
          // Convert manifest to Plugin object
          const plugin = this.manifestToPlugin(manifest, dir);
          this.plugins.set(plugin.id, plugin);
        } catch (error) {
          logger.warn(`Failed to load plugin from ${dir}:`, error);
        }
      }
      
      logger.info(`Loaded ${this.plugins.size} plugins`);
    } catch (error) {
      logger.error('Error loading installed plugins:', error);
    }
  }

  private manifestToPlugin(manifest: any, id: string): Plugin {
    return {
      id,
      name: manifest.name || id,
      displayName: manifest.displayName || manifest.name || id,
      description: manifest.description || '',
      version: manifest.version || '1.0.0',
      author: {
        id: manifest.publisher || 'unknown',
        name: manifest.author?.name || manifest.publisher || 'Unknown',
        email: manifest.author?.email || '',
        url: manifest.author?.url,
        verified: false,
      },
      category: manifest.categories?.[0] || PluginCategory.OTHER,
      tags: manifest.keywords || [],
      icon: manifest.icon,
      screenshots: manifest.screenshots || [],
      homepage: manifest.homepage,
      repository: manifest.repository?.url || manifest.repository,
      license: manifest.license || 'MIT',
      engines: manifest.engines || { neoai: '*' },
      main: manifest.main || 'extension.js',
      contributes: manifest.contributes || {},
      dependencies: manifest.dependencies,
      devDependencies: manifest.devDependencies,
      activationEvents: manifest.activationEvents || ['*'],
      extensionDependencies: manifest.extensionDependencies,
      extensionPack: manifest.extensionPack,
      pricing: {
        type: 'free',
      },
      status: PluginStatus.PUBLISHED,
      security: {
        scanned: false,
        vulnerabilities: [],
        permissions: [],
        sandboxed: true,
        trustedPublisher: false,
      },
      metrics: {
        downloads: 0,
        weeklyDownloads: 0,
        rating: 0,
        ratingCount: 0,
        reviews: 0,
        lastUpdated: new Date(),
        size: 0,
        installCount: 0,
        activeInstalls: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createPluginContext(plugin: Plugin): PluginContext {
    return {
      subscriptions: [],
      globalState: {},
      workspaceState: {},
      extensionPath: path.join(this.pluginDirectory, plugin.id),
      storagePath: path.join(this.pluginDirectory, plugin.id, 'storage'),
      globalStoragePath: path.join(this.pluginDirectory, 'global-storage'),
      logPath: path.join(this.pluginDirectory, plugin.id, 'logs'),
      extensionUri: `file://${path.join(this.pluginDirectory, plugin.id)}`,
      environmentVariableCollection: {},
    };
  }

  private createRequireFunction(plugin: Plugin) {
    return (moduleName: string) => {
      // Whitelist of allowed modules
      const allowedModules = [
        'path',
        'fs',
        'util',
        'events',
        'crypto',
        'url',
        'querystring',
        'stream',
        'buffer',
        'string_decoder',
        'os',
      ];

      if (allowedModules.includes(moduleName)) {
        return require(moduleName);
      }

      // Check plugin dependencies
      if (plugin.dependencies && plugin.dependencies[moduleName]) {
        try {
          return require(moduleName);
        } catch (error) {
          throw new Error(`Module '${moduleName}' not found`);
        }
      }

      throw new Error(`Module '${moduleName}' is not allowed`);
    };
  }

  private async downloadPlugin(pluginId: string, version: string): Promise<void> {
    // TODO: Implement plugin download from marketplace
    logger.info(`Downloading plugin ${pluginId} version ${version}`);
  }

  private async cleanupPluginFiles(pluginId: string, userId: string): Promise<void> {
    // TODO: Implement user-specific plugin file cleanup
    logger.info(`Cleaning up plugin files for ${pluginId} user ${userId}`);
  }

  private calculatePopularityScore(plugin: Plugin): number {
    const { downloads, rating, ratingCount } = plugin.metrics;
    return (downloads * 0.3) + (rating * ratingCount * 0.7);
  }
}
