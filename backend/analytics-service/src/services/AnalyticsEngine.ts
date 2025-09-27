import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import * as ss from 'simple-statistics';
import { ClickHouse } from 'clickhouse';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';

export interface AnalyticsQuery {
  id: string;
  name: string;
  type: 'timeseries' | 'aggregate' | 'funnel' | 'cohort' | 'retention';
  dimensions: string[];
  metrics: string[];
  filters: Filter[];
  timeRange: { start: Date; end: Date };
  granularity: 'hour' | 'day' | 'week' | 'month';
  limit?: number;
}

export interface Filter {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'contains';
  value: any;
}

export interface AnalyticsResult {
  queryId: string;
  data: any[];
  metadata: { columns: any[]; query: string; dataSource: string };
  executionTime: number;
  totalRows: number;
  cached: boolean;
  generatedAt: Date;
}

export interface AnalyticsEvent {
  id: string;
  eventType: string;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
  timestamp: Date;
  properties: Record<string, any>;
}

export class AnalyticsEngine {
  private clickhouse: ClickHouse;
  private elasticsearch: ElasticsearchClient;
  private queryCache: Map<string, { result: AnalyticsResult; expiry: Date }> = new Map();

  constructor() {
    this.clickhouse = new ClickHouse({
      url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USERNAME || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: process.env.CLICKHOUSE_DATABASE || 'neoai_analytics',
    });

    this.elasticsearch = new ElasticsearchClient({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || '',
      },
    });
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Analytics Engine...');
    
    try {
      // Test connections
      await this.testConnections();
      
      // Setup cache cleanup
      setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
      
      logger.info('✅ Analytics Engine initialized');
    } catch (error) {
      logger.error('Failed to initialize Analytics Engine:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Analytics Engine...');
    await this.elasticsearch.close();
    this.queryCache.clear();
    logger.info('✅ Analytics Engine cleaned up');
  }

  async executeQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const startTime = Date.now();
    
    try {
      // Check cache
      const cacheKey = this.generateCacheKey(query);
      const cached = this.queryCache.get(cacheKey);
      
      if (cached && cached.expiry > new Date()) {
        return { ...cached.result, cached: true };
      }

      // Execute query
      let result: AnalyticsResult;
      
      switch (query.type) {
        case 'timeseries':
          result = await this.executeTimeseriesQuery(query);
          break;
        case 'aggregate':
          result = await this.executeAggregateQuery(query);
          break;
        case 'funnel':
          result = await this.executeFunnelQuery(query);
          break;
        case 'cohort':
          result = await this.executeCohortQuery(query);
          break;
        case 'retention':
          result = await this.executeRetentionQuery(query);
          break;
        default:
          throw new Error(`Unsupported query type: ${query.type}`);
      }

      result.executionTime = Date.now() - startTime;
      result.cached = false;
      result.generatedAt = new Date();

      // Cache result
      this.cacheResult(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error executing analytics query:', error);
      throw error;
    }
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Store in ClickHouse for analytics
      await this.storeEventInClickHouse(event);
      
      // Store in Elasticsearch for search
      await this.storeEventInElasticsearch(event);
      
      logger.debug(`Event tracked: ${event.eventType}`);
    } catch (error) {
      logger.error('Error tracking event:', error);
      throw error;
    }
  }

  async calculateStatistics(data: number[]): Promise<{
    count: number;
    mean: number;
    median: number;
    standardDeviation: number;
    min: number;
    max: number;
    percentiles: { [key: string]: number };
  }> {
    if (data.length === 0) {
      throw new Error('Cannot calculate statistics for empty dataset');
    }

    return {
      count: data.length,
      mean: ss.mean(data),
      median: ss.median(data),
      standardDeviation: ss.standardDeviation(data),
      min: ss.min(data),
      max: ss.max(data),
      percentiles: {
        '25': ss.quantile(data, 0.25),
        '50': ss.quantile(data, 0.5),
        '75': ss.quantile(data, 0.75),
        '90': ss.quantile(data, 0.9),
        '95': ss.quantile(data, 0.95),
        '99': ss.quantile(data, 0.99),
      },
    };
  }

  async detectAnomalies(data: number[], sensitivity: number = 2): Promise<{
    anomalies: Array<{ index: number; value: number; score: number }>;
    threshold: number;
  }> {
    const stats = await this.calculateStatistics(data);
    const threshold = stats.mean + (sensitivity * stats.standardDeviation);
    
    const anomalies = data
      .map((value, index) => ({
        index,
        value,
        score: Math.abs(value - stats.mean) / stats.standardDeviation,
      }))
      .filter(item => item.score > sensitivity);

    return { anomalies, threshold };
  }

  private async testConnections(): Promise<void> {
    // Test ClickHouse
    await this.clickhouse.query('SELECT 1');
    
    // Test Elasticsearch
    await this.elasticsearch.ping();
  }

  private async executeTimeseriesQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const sql = this.buildTimeseriesSQL(query);
    const result = await this.clickhouse.query(sql);
    const data = await result.json();

    return {
      queryId: query.id,
      data: data.data,
      metadata: { columns: data.meta, query: sql, dataSource: 'clickhouse' },
      executionTime: 0,
      totalRows: data.rows,
      cached: false,
      generatedAt: new Date(),
    };
  }

  private async executeAggregateQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const sql = this.buildAggregateSQL(query);
    const result = await this.clickhouse.query(sql);
    const data = await result.json();

    return {
      queryId: query.id,
      data: data.data,
      metadata: { columns: data.meta, query: sql, dataSource: 'clickhouse' },
      executionTime: 0,
      totalRows: data.rows,
      cached: false,
      generatedAt: new Date(),
    };
  }

  private async executeFunnelQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const sql = this.buildFunnelSQL(query);
    const result = await this.clickhouse.query(sql);
    const data = await result.json();

    return {
      queryId: query.id,
      data: data.data,
      metadata: { columns: data.meta, query: sql, dataSource: 'clickhouse' },
      executionTime: 0,
      totalRows: data.rows,
      cached: false,
      generatedAt: new Date(),
    };
  }

  private async executeCohortQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const sql = this.buildCohortSQL(query);
    const result = await this.clickhouse.query(sql);
    const data = await result.json();

    return {
      queryId: query.id,
      data: data.data,
      metadata: { columns: data.meta, query: sql, dataSource: 'clickhouse' },
      executionTime: 0,
      totalRows: data.rows,
      cached: false,
      generatedAt: new Date(),
    };
  }

  private async executeRetentionQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const sql = this.buildRetentionSQL(query);
    const result = await this.clickhouse.query(sql);
    const data = await result.json();

    return {
      queryId: query.id,
      data: data.data,
      metadata: { columns: data.meta, query: sql, dataSource: 'clickhouse' },
      executionTime: 0,
      totalRows: data.rows,
      cached: false,
      generatedAt: new Date(),
    };
  }

  private buildTimeseriesSQL(query: AnalyticsQuery): string {
    const timeColumn = this.getTimeColumn(query.granularity);
    const metrics = query.metrics.map(m => `COUNT(*) as ${m}`).join(', ');
    const whereClause = this.buildWhereClause(query.filters, query.timeRange);

    return `
      SELECT 
        ${timeColumn} as time,
        ${query.dimensions.join(', ')},
        ${metrics}
      FROM events
      ${whereClause}
      GROUP BY time, ${query.dimensions.join(', ')}
      ORDER BY time
      ${query.limit ? `LIMIT ${query.limit}` : ''}
    `.trim();
  }

  private buildAggregateSQL(query: AnalyticsQuery): string {
    const metrics = query.metrics.map(m => `COUNT(*) as ${m}`).join(', ');
    const whereClause = this.buildWhereClause(query.filters, query.timeRange);

    return `
      SELECT 
        ${query.dimensions.join(', ')},
        ${metrics}
      FROM events
      ${whereClause}
      GROUP BY ${query.dimensions.join(', ')}
      ORDER BY ${metrics.split(' ')[0]} DESC
      ${query.limit ? `LIMIT ${query.limit}` : ''}
    `.trim();
  }

  private buildFunnelSQL(query: AnalyticsQuery): string {
    return `
      SELECT 
        event_type as step,
        COUNT(DISTINCT user_id) as users
      FROM events
      WHERE event_type IN (${query.dimensions.map(d => `'${d}'`).join(', ')})
        AND timestamp BETWEEN '${query.timeRange.start.toISOString()}' AND '${query.timeRange.end.toISOString()}'
      GROUP BY event_type
      ORDER BY users DESC
    `;
  }

  private buildCohortSQL(query: AnalyticsQuery): string {
    return `
      WITH user_cohorts AS (
        SELECT 
          user_id,
          toStartOfMonth(MIN(timestamp)) as cohort_month
        FROM events
        WHERE timestamp BETWEEN '${query.timeRange.start.toISOString()}' AND '${query.timeRange.end.toISOString()}'
        GROUP BY user_id
      )
      SELECT 
        cohort_month,
        COUNT(DISTINCT user_id) as users
      FROM user_cohorts
      GROUP BY cohort_month
      ORDER BY cohort_month
    `;
  }

  private buildRetentionSQL(query: AnalyticsQuery): string {
    return `
      WITH first_events AS (
        SELECT 
          user_id,
          MIN(toDate(timestamp)) as first_event_date
        FROM events
        WHERE timestamp BETWEEN '${query.timeRange.start.toISOString()}' AND '${query.timeRange.end.toISOString()}'
        GROUP BY user_id
      )
      SELECT 
        first_event_date,
        COUNT(DISTINCT user_id) as new_users
      FROM first_events
      GROUP BY first_event_date
      ORDER BY first_event_date
    `;
  }

  private getTimeColumn(granularity: string): string {
    const timeColumns = {
      hour: 'toStartOfHour(timestamp)',
      day: 'toDate(timestamp)', 
      week: 'toStartOfWeek(timestamp)',
      month: 'toStartOfMonth(timestamp)',
    };
    return timeColumns[granularity] || timeColumns.day;
  }

  private buildWhereClause(filters: Filter[], timeRange: { start: Date; end: Date }): string {
    const conditions = [
      `timestamp BETWEEN '${timeRange.start.toISOString()}' AND '${timeRange.end.toISOString()}'`
    ];

    filters.forEach(filter => {
      conditions.push(this.buildFilterCondition(filter));
    });

    return `WHERE ${conditions.join(' AND ')}`;
  }

  private buildFilterCondition(filter: Filter): string {
    switch (filter.operator) {
      case 'equals':
        return `${filter.field} = '${filter.value}'`;
      case 'greater_than':
        return `${filter.field} > ${filter.value}`;
      case 'less_than':
        return `${filter.field} < ${filter.value}`;
      case 'in':
        return `${filter.field} IN (${filter.value.map(v => `'${v}'`).join(', ')})`;
      case 'contains':
        return `${filter.field} LIKE '%${filter.value}%'`;
      default:
        return `${filter.field} = '${filter.value}'`;
    }
  }

  private generateCacheKey(query: AnalyticsQuery): string {
    return `query:${JSON.stringify(query)}`;
  }

  private cacheResult(key: string, result: AnalyticsResult): void {
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    this.queryCache.set(key, { result, expiry });
  }

  private cleanupCache(): void {
    const now = new Date();
    for (const [key, cached] of this.queryCache) {
      if (cached.expiry < now) {
        this.queryCache.delete(key);
      }
    }
  }

  private async storeEventInClickHouse(event: AnalyticsEvent): Promise<void> {
    const sql = `
      INSERT INTO events (id, event_type, user_id, session_id, tenant_id, timestamp, properties)
      VALUES ('${event.id}', '${event.eventType}', '${event.userId}', '${event.sessionId}', '${event.tenantId}', '${event.timestamp.toISOString()}', '${JSON.stringify(event.properties)}')
    `;
    await this.clickhouse.query(sql);
  }

  private async storeEventInElasticsearch(event: AnalyticsEvent): Promise<void> {
    await this.elasticsearch.index({
      index: 'events',
      id: event.id,
      body: event,
    });
  }
}
