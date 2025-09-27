import { v4 as uuidv4 } from 'uuid';
import * as semver from 'semver';
import { logger } from '../utils/logger';
import { Plugin, PluginStatus, PluginCategory } from './PluginManager';

export interface MarketplaceListing {
  id: string;
  pluginId: string;
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  features: string[];
  changelog: VersionChangelog[];
  screenshots: MarketplaceScreenshot[];
  videos: MarketplaceVideo[];
  documentation: MarketplaceDocumentation;
  support: MarketplaceSupport;
  pricing: MarketplacePricing;
  compatibility: MarketplaceCompatibility;
  tags: string[];
  featured: boolean;
  trending: boolean;
  editorsChoice: boolean;
  publishedAt: Date;
  lastUpdated: Date;
  status: MarketplaceListingStatus;
}

export interface VersionChangelog {
  version: string;
  date: Date;
  changes: ChangelogEntry[];
}

export interface ChangelogEntry {
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
  description: string;
}

export interface MarketplaceScreenshot {
  id: string;
  url: string;
  caption: string;
  order: number;
}

export interface MarketplaceVideo {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  duration: number;
}

export interface MarketplaceDocumentation {
  readme: string;
  installation: string;
  usage: string;
  configuration: string;
  api: string;
  faq: string;
  troubleshooting: string;
}

export interface MarketplaceSupport {
  email?: string;
  website?: string;
  documentation?: string;
  issues?: string;
  forum?: string;
  chat?: string;
}

export interface MarketplacePricing {
  type: 'free' | 'paid' | 'freemium' | 'subscription';
  price?: number;
  currency?: string;
  billingPeriod?: 'monthly' | 'yearly' | 'one-time';
  trialDays?: number;
  features: PricingFeature[];
  plans?: PricingPlan[];
}

export interface PricingFeature {
  name: string;
  included: boolean;
  limit?: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly' | 'one-time';
  features: PricingFeature[];
  popular?: boolean;
}

export interface MarketplaceCompatibility {
  neoaiVersion: string;
  nodeVersion?: string;
  platforms: string[];
  languages: string[];
  frameworks: string[];
}

export enum MarketplaceListingStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export interface MarketplaceReview {
  id: string;
  pluginId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  content: string;
  helpful: number;
  notHelpful: number;
  verified: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  response?: MarketplaceReviewResponse;
}

export interface MarketplaceReviewResponse {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

export interface MarketplaceStats {
  totalPlugins: number;
  totalDownloads: number;
  totalUsers: number;
  totalDevelopers: number;
  categoryStats: CategoryStats[];
  topPlugins: Plugin[];
  trendingPlugins: Plugin[];
  recentPlugins: Plugin[];
}

export interface CategoryStats {
  category: PluginCategory;
  count: number;
  downloads: number;
  averageRating: number;
}

export interface SearchFilters {
  category?: PluginCategory;
  pricing?: 'free' | 'paid' | 'freemium';
  rating?: number;
  compatibility?: string;
  verified?: boolean;
  featured?: boolean;
  trending?: boolean;
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  plugins: Plugin[];
  total: number;
  page: number;
  limit: number;
  filters: SearchFilters;
}

export class MarketplaceManager {
  private listings: Map<string, MarketplaceListing> = new Map();
  private reviews: Map<string, MarketplaceReview[]> = new Map(); // pluginId -> reviews
  private stats: MarketplaceStats | null = null;

  async initialize(): Promise<void> {
    logger.info('Initializing Marketplace Manager...');
    
    try {
      // Load marketplace data
      await this.loadMarketplaceData();
      
      // Initialize stats
      await this.updateStats();
      
      // Setup periodic stats update
      setInterval(() => {
        this.updateStats();
      }, 60 * 60 * 1000); // Every hour
      
      logger.info('✅ Marketplace Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize Marketplace Manager:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Marketplace Manager...');
    
    this.listings.clear();
    this.reviews.clear();
    this.stats = null;
    
    logger.info('✅ Marketplace Manager cleaned up');
  }

  async createListing(plugin: Plugin): Promise<MarketplaceListing> {
    try {
      const listing: MarketplaceListing = {
        id: uuidv4(),
        pluginId: plugin.id,
        title: plugin.displayName,
        subtitle: plugin.description,
        description: plugin.description,
        longDescription: plugin.description,
        features: [],
        changelog: [{
          version: plugin.version,
          date: new Date(),
          changes: [{
            type: 'added',
            description: 'Initial release',
          }],
        }],
        screenshots: [],
        videos: [],
        documentation: {
          readme: '',
          installation: '',
          usage: '',
          configuration: '',
          api: '',
          faq: '',
          troubleshooting: '',
        },
        support: {},
        pricing: {
          type: plugin.pricing.type,
          price: plugin.pricing.price,
          currency: plugin.pricing.currency,
          billingPeriod: plugin.pricing.billingPeriod,
          trialDays: plugin.pricing.trialDays,
          features: [],
        },
        compatibility: {
          neoaiVersion: plugin.engines.neoai,
          nodeVersion: plugin.engines.node,
          platforms: ['web', 'desktop'],
          languages: [],
          frameworks: [],
        },
        tags: plugin.tags,
        featured: false,
        trending: false,
        editorsChoice: false,
        publishedAt: new Date(),
        lastUpdated: new Date(),
        status: MarketplaceListingStatus.DRAFT,
      };

      this.listings.set(listing.id, listing);
      
      logger.info(`Created marketplace listing for plugin ${plugin.id}`);
      return listing;
    } catch (error) {
      logger.error(`Error creating marketplace listing:`, error);
      throw error;
    }
  }

  async updateListing(listingId: string, updates: Partial<MarketplaceListing>): Promise<MarketplaceListing | null> {
    try {
      const listing = this.listings.get(listingId);
      if (!listing) {
        return null;
      }

      const updatedListing = {
        ...listing,
        ...updates,
        lastUpdated: new Date(),
      };

      this.listings.set(listingId, updatedListing);
      
      logger.info(`Updated marketplace listing ${listingId}`);
      return updatedListing;
    } catch (error) {
      logger.error(`Error updating marketplace listing:`, error);
      return null;
    }
  }

  async publishListing(listingId: string): Promise<boolean> {
    try {
      const listing = this.listings.get(listingId);
      if (!listing) {
        return false;
      }

      // Validate listing before publishing
      if (!this.validateListing(listing)) {
        return false;
      }

      listing.status = MarketplaceListingStatus.PUBLISHED;
      listing.publishedAt = new Date();
      listing.lastUpdated = new Date();

      logger.info(`Published marketplace listing ${listingId}`);
      return true;
    } catch (error) {
      logger.error(`Error publishing marketplace listing:`, error);
      return false;
    }
  }

  async searchPlugins(query: string, filters: SearchFilters = {}, page = 1, limit = 20): Promise<SearchResult> {
    try {
      const allListings = Array.from(this.listings.values())
        .filter(listing => listing.status === MarketplaceListingStatus.PUBLISHED);

      // Apply filters
      let filteredListings = allListings;

      if (filters.category) {
        // TODO: Get plugin category from plugin data
        // filteredListings = filteredListings.filter(listing => plugin.category === filters.category);
      }

      if (filters.pricing) {
        filteredListings = filteredListings.filter(listing => listing.pricing.type === filters.pricing);
      }

      if (filters.featured) {
        filteredListings = filteredListings.filter(listing => listing.featured);
      }

      if (filters.trending) {
        filteredListings = filteredListings.filter(listing => listing.trending);
      }

      // Apply text search
      if (query) {
        const searchTerms = query.toLowerCase().split(' ');
        filteredListings = filteredListings.filter(listing => {
          const searchableText = [
            listing.title,
            listing.subtitle,
            listing.description,
            ...listing.tags,
          ].join(' ').toLowerCase();

          return searchTerms.some(term => searchableText.includes(term));
        });
      }

      // Sort results
      filteredListings.sort((a, b) => {
        switch (filters.sortBy) {
          case 'name':
            return filters.sortOrder === 'desc' 
              ? b.title.localeCompare(a.title)
              : a.title.localeCompare(b.title);
          case 'updated':
            return filters.sortOrder === 'desc'
              ? b.lastUpdated.getTime() - a.lastUpdated.getTime()
              : a.lastUpdated.getTime() - b.lastUpdated.getTime();
          default:
            // Default to relevance/popularity
            return b.publishedAt.getTime() - a.publishedAt.getTime();
        }
      });

      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedListings = filteredListings.slice(startIndex, endIndex);

      // Convert to plugins (simplified for now)
      const plugins: Plugin[] = paginatedListings.map(listing => ({
        id: listing.pluginId,
        name: listing.title,
        displayName: listing.title,
        description: listing.description,
        version: '1.0.0', // TODO: Get from plugin data
        author: {
          id: 'unknown',
          name: 'Unknown',
          email: '',
          verified: false,
        },
        category: PluginCategory.OTHER,
        tags: listing.tags,
        license: 'MIT',
        engines: { neoai: '*' },
        main: 'index.js',
        contributes: {},
        activationEvents: ['*'],
        pricing: {
          type: listing.pricing.type,
          price: listing.pricing.price,
          currency: listing.pricing.currency,
          billingPeriod: listing.pricing.billingPeriod,
          trialDays: listing.pricing.trialDays,
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
          lastUpdated: listing.lastUpdated,
          size: 0,
          installCount: 0,
          activeInstalls: 0,
        },
        createdAt: listing.publishedAt,
        updatedAt: listing.lastUpdated,
      }));

      return {
        plugins,
        total: filteredListings.length,
        page,
        limit,
        filters,
      };
    } catch (error) {
      logger.error('Error searching plugins:', error);
      return {
        plugins: [],
        total: 0,
        page,
        limit,
        filters,
      };
    }
  }

  async addReview(review: Omit<MarketplaceReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<MarketplaceReview> {
    try {
      const newReview: MarketplaceReview = {
        ...review,
        id: uuidv4(),
        helpful: 0,
        notHelpful: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const pluginReviews = this.reviews.get(review.pluginId) || [];
      pluginReviews.push(newReview);
      this.reviews.set(review.pluginId, pluginReviews);

      logger.info(`Added review for plugin ${review.pluginId}`);
      return newReview;
    } catch (error) {
      logger.error('Error adding review:', error);
      throw error;
    }
  }

  async getReviews(pluginId: string, page = 1, limit = 10): Promise<{ reviews: MarketplaceReview[]; total: number }> {
    try {
      const allReviews = this.reviews.get(pluginId) || [];
      
      // Sort by most helpful first
      const sortedReviews = allReviews.sort((a, b) => {
        const scoreA = a.helpful - a.notHelpful;
        const scoreB = b.helpful - b.notHelpful;
        return scoreB - scoreA;
      });

      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedReviews = sortedReviews.slice(startIndex, endIndex);

      return {
        reviews: paginatedReviews,
        total: allReviews.length,
      };
    } catch (error) {
      logger.error('Error getting reviews:', error);
      return { reviews: [], total: 0 };
    }
  }

  async getStats(): Promise<MarketplaceStats> {
    if (!this.stats) {
      await this.updateStats();
    }
    return this.stats!;
  }

  async getFeaturedPlugins(): Promise<Plugin[]> {
    try {
      const featuredListings = Array.from(this.listings.values())
        .filter(listing => listing.featured && listing.status === MarketplaceListingStatus.PUBLISHED)
        .slice(0, 10);

      // Convert to plugins (simplified)
      return featuredListings.map(listing => this.listingToPlugin(listing));
    } catch (error) {
      logger.error('Error getting featured plugins:', error);
      return [];
    }
  }

  async getTrendingPlugins(): Promise<Plugin[]> {
    try {
      const trendingListings = Array.from(this.listings.values())
        .filter(listing => listing.trending && listing.status === MarketplaceListingStatus.PUBLISHED)
        .slice(0, 10);

      return trendingListings.map(listing => this.listingToPlugin(listing));
    } catch (error) {
      logger.error('Error getting trending plugins:', error);
      return [];
    }
  }

  private async loadMarketplaceData(): Promise<void> {
    try {
      // TODO: Load from database
      logger.info('Loaded marketplace data');
    } catch (error) {
      logger.error('Error loading marketplace data:', error);
    }
  }

  private async updateStats(): Promise<void> {
    try {
      const listings = Array.from(this.listings.values());
      const publishedListings = listings.filter(l => l.status === MarketplaceListingStatus.PUBLISHED);

      this.stats = {
        totalPlugins: publishedListings.length,
        totalDownloads: 0, // TODO: Calculate from plugin metrics
        totalUsers: 0, // TODO: Get from user service
        totalDevelopers: 0, // TODO: Calculate unique developers
        categoryStats: [], // TODO: Calculate category stats
        topPlugins: [], // TODO: Get top plugins by downloads/rating
        trendingPlugins: publishedListings.filter(l => l.trending).map(l => this.listingToPlugin(l)),
        recentPlugins: publishedListings
          .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
          .slice(0, 10)
          .map(l => this.listingToPlugin(l)),
      };

      logger.debug('Updated marketplace stats');
    } catch (error) {
      logger.error('Error updating marketplace stats:', error);
    }
  }

  private validateListing(listing: MarketplaceListing): boolean {
    // Basic validation
    if (!listing.title || !listing.description) {
      return false;
    }

    if (!listing.pricing.type) {
      return false;
    }

    // TODO: Add more validation rules
    return true;
  }

  private listingToPlugin(listing: MarketplaceListing): Plugin {
    return {
      id: listing.pluginId,
      name: listing.title,
      displayName: listing.title,
      description: listing.description,
      version: '1.0.0',
      author: {
        id: 'unknown',
        name: 'Unknown',
        email: '',
        verified: false,
      },
      category: PluginCategory.OTHER,
      tags: listing.tags,
      license: 'MIT',
      engines: { neoai: '*' },
      main: 'index.js',
      contributes: {},
      activationEvents: ['*'],
      pricing: {
        type: listing.pricing.type,
        price: listing.pricing.price,
        currency: listing.pricing.currency,
        billingPeriod: listing.pricing.billingPeriod,
        trialDays: listing.pricing.trialDays,
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
        lastUpdated: listing.lastUpdated,
        size: 0,
        installCount: 0,
        activeInstalls: 0,
      },
      createdAt: listing.publishedAt,
      updatedAt: listing.lastUpdated,
    };
  }
}
