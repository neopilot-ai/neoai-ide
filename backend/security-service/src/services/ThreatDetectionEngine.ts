import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import * as geoip from 'geoip-lite';
import * as useragent from 'useragent';
import { DeviceDetector } from 'device-detector-js';

export interface ThreatEvent {
  id: string;
  type: ThreatType;
  severity: ThreatSeverity;
  source: string;
  target: string;
  description: string;
  indicators: ThreatIndicator[];
  metadata: ThreatMetadata;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export enum ThreatType {
  BRUTE_FORCE = 'brute_force',
  SQL_INJECTION = 'sql_injection',
  XSS = 'xss',
  CSRF = 'csrf',
  DDoS = 'ddos',
  MALWARE = 'malware',
  PHISHING = 'phishing',
  DATA_EXFILTRATION = 'data_exfiltration',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  VULNERABILITY_EXPLOIT = 'vulnerability_exploit',
  INSIDER_THREAT = 'insider_threat',
  API_ABUSE = 'api_abuse',
  RECONNAISSANCE = 'reconnaissance',
}

export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ThreatIndicator {
  type: IndicatorType;
  value: string;
  confidence: number;
  source: string;
}

export enum IndicatorType {
  IP_ADDRESS = 'ip_address',
  DOMAIN = 'domain',
  URL = 'url',
  FILE_HASH = 'file_hash',
  EMAIL = 'email',
  USER_AGENT = 'user_agent',
  SIGNATURE = 'signature',
  PATTERN = 'pattern',
}

export interface ThreatMetadata {
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    region: string;
    city: string;
    coordinates: [number, number];
  };
  device?: {
    type: string;
    os: string;
    browser: string;
    version: string;
  };
  session?: {
    id: string;
    userId?: string;
    duration: number;
  };
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  };
  response?: {
    statusCode: number;
    size: number;
    duration: number;
  };
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  severity: ThreatSeverity;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum RuleType {
  RATE_LIMIT = 'rate_limit',
  PATTERN_MATCH = 'pattern_match',
  ANOMALY_DETECTION = 'anomaly_detection',
  BLACKLIST = 'blacklist',
  WHITELIST = 'whitelist',
  BEHAVIORAL = 'behavioral',
  SIGNATURE = 'signature',
}

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  threshold?: number;
  timeWindow?: number;
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  MATCHES = 'matches',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN = 'in',
  NOT_IN = 'not_in',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
}

export interface RuleAction {
  type: ActionType;
  parameters: Record<string, any>;
}

export enum ActionType {
  BLOCK = 'block',
  ALERT = 'alert',
  LOG = 'log',
  RATE_LIMIT = 'rate_limit',
  CAPTCHA = 'captcha',
  MFA_REQUIRED = 'mfa_required',
  QUARANTINE = 'quarantine',
  NOTIFY = 'notify',
}

export interface ThreatIntelligence {
  id: string;
  type: IndicatorType;
  value: string;
  confidence: number;
  severity: ThreatSeverity;
  category: string;
  description: string;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
  references: string[];
}

export class ThreatDetectionEngine {
  private rules: Map<string, SecurityRule> = new Map();
  private threatIntel: Map<string, ThreatIntelligence> = new Map();
  private activeThreats: Map<string, ThreatEvent> = new Map();
  private deviceDetector: DeviceDetector;
  private behaviorProfiles: Map<string, UserBehaviorProfile> = new Map();

  constructor() {
    this.deviceDetector = new DeviceDetector();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Threat Detection Engine...');
    
    try {
      // Load security rules
      await this.loadSecurityRules();
      
      // Load threat intelligence feeds
      await this.loadThreatIntelligence();
      
      // Start periodic updates
      setInterval(() => {
        this.updateThreatIntelligence();
      }, 60 * 60 * 1000); // Every hour
      
      // Start behavior analysis
      setInterval(() => {
        this.analyzeBehaviorPatterns();
      }, 5 * 60 * 1000); // Every 5 minutes
      
      logger.info('✅ Threat Detection Engine initialized');
    } catch (error) {
      logger.error('Failed to initialize Threat Detection Engine:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Threat Detection Engine...');
    
    this.rules.clear();
    this.threatIntel.clear();
    this.activeThreats.clear();
    this.behaviorProfiles.clear();
    
    logger.info('✅ Threat Detection Engine cleaned up');
  }

  async analyzeRequest(request: SecurityRequest): Promise<ThreatAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const threats: ThreatEvent[] = [];
      const metadata = await this.extractMetadata(request);
      
      // Check against security rules
      for (const rule of this.rules.values()) {
        if (!rule.enabled) continue;
        
        const ruleResult = await this.evaluateRule(rule, request, metadata);
        if (ruleResult.triggered) {
          threats.push(...ruleResult.threats);
        }
      }
      
      // Check threat intelligence
      const intelThreats = await this.checkThreatIntelligence(request, metadata);
      threats.push(...intelThreats);
      
      // Analyze user behavior
      const behaviorThreats = await this.analyzeBehavior(request, metadata);
      threats.push(...behaviorThreats);
      
      // Update behavior profile
      await this.updateBehaviorProfile(request, metadata);
      
      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(threats);
      
      const result: ThreatAnalysisResult = {
        requestId: request.id,
        riskScore,
        threats,
        blocked: threats.some(t => t.severity === ThreatSeverity.CRITICAL),
        actions: this.determineActions(threats),
        analysisTime: Date.now() - startTime,
        timestamp: new Date(),
      };
      
      // Store active threats
      threats.forEach(threat => {
        this.activeThreats.set(threat.id, threat);
      });
      
      return result;
    } catch (error) {
      logger.error('Error analyzing request:', error);
      throw error;
    }
  }

  async createRule(rule: Omit<SecurityRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityRule> {
    const securityRule: SecurityRule = {
      ...rule,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(securityRule.id, securityRule);
    
    // TODO: Save to database
    
    logger.info(`Created security rule: ${securityRule.name}`);
    return securityRule;
  }

  async updateRule(ruleId: string, updates: Partial<SecurityRule>): Promise<SecurityRule | null> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return null;
    }

    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };

    this.rules.set(ruleId, updatedRule);
    
    // TODO: Update in database
    
    logger.info(`Updated security rule: ${updatedRule.name}`);
    return updatedRule;
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    const deleted = this.rules.delete(ruleId);
    
    if (deleted) {
      // TODO: Delete from database
      logger.info(`Deleted security rule: ${ruleId}`);
    }
    
    return deleted;
  }

  async getActiveThreats(): Promise<ThreatEvent[]> {
    return Array.from(this.activeThreats.values())
      .filter(threat => !threat.resolved);
  }

  async resolveThreat(threatId: string, resolvedBy: string): Promise<boolean> {
    const threat = this.activeThreats.get(threatId);
    if (!threat) {
      return false;
    }

    threat.resolved = true;
    threat.resolvedAt = new Date();
    threat.resolvedBy = resolvedBy;

    // TODO: Update in database
    
    logger.info(`Resolved threat: ${threatId}`);
    return true;
  }

  private async extractMetadata(request: SecurityRequest): Promise<ThreatMetadata> {
    const ipAddress = request.ipAddress;
    const userAgent = request.headers['user-agent'] || '';
    
    // Get geolocation
    const location = geoip.lookup(ipAddress);
    
    // Parse user agent
    const agent = useragent.parse(userAgent);
    const device = this.deviceDetector.parse(userAgent);
    
    return {
      ipAddress,
      userAgent,
      location: location ? {
        country: location.country,
        region: location.region,
        city: location.city,
        coordinates: [location.ll[1], location.ll[0]], // [lng, lat]
      } : undefined,
      device: {
        type: device.device?.type || 'unknown',
        os: `${device.os?.name || 'unknown'} ${device.os?.version || ''}`.trim(),
        browser: `${device.client?.name || 'unknown'} ${device.client?.version || ''}`.trim(),
        version: agent.toVersion(),
      },
      session: request.session ? {
        id: request.session.id,
        userId: request.session.userId,
        duration: Date.now() - new Date(request.session.createdAt).getTime(),
      } : undefined,
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
      },
    };
  }

  private async evaluateRule(
    rule: SecurityRule,
    request: SecurityRequest,
    metadata: ThreatMetadata
  ): Promise<{ triggered: boolean; threats: ThreatEvent[] }> {
    const threats: ThreatEvent[] = [];
    
    // Check all conditions
    const conditionsMet = rule.conditions.every(condition => {
      return this.evaluateCondition(condition, request, metadata);
    });
    
    if (conditionsMet) {
      const threat: ThreatEvent = {
        id: uuidv4(),
        type: this.mapRuleTypeToThreatType(rule.type),
        severity: rule.severity,
        source: metadata.ipAddress,
        target: request.url,
        description: `Security rule triggered: ${rule.name}`,
        indicators: [{
          type: IndicatorType.IP_ADDRESS,
          value: metadata.ipAddress,
          confidence: 0.8,
          source: 'security_rule',
        }],
        metadata,
        timestamp: new Date(),
        resolved: false,
      };
      
      threats.push(threat);
    }
    
    return { triggered: conditionsMet, threats };
  }

  private evaluateCondition(
    condition: RuleCondition,
    request: SecurityRequest,
    metadata: ThreatMetadata
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, request, metadata);
    
    switch (condition.operator) {
      case ConditionOperator.EQUALS:
        return fieldValue === condition.value;
      case ConditionOperator.NOT_EQUALS:
        return fieldValue !== condition.value;
      case ConditionOperator.CONTAINS:
        return String(fieldValue).includes(String(condition.value));
      case ConditionOperator.NOT_CONTAINS:
        return !String(fieldValue).includes(String(condition.value));
      case ConditionOperator.MATCHES:
        return new RegExp(condition.value).test(String(fieldValue));
      case ConditionOperator.GREATER_THAN:
        return Number(fieldValue) > Number(condition.value);
      case ConditionOperator.LESS_THAN:
        return Number(fieldValue) < Number(condition.value);
      case ConditionOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case ConditionOperator.NOT_IN:
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case ConditionOperator.EXISTS:
        return fieldValue !== undefined && fieldValue !== null;
      case ConditionOperator.NOT_EXISTS:
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }

  private getFieldValue(field: string, request: SecurityRequest, metadata: ThreatMetadata): any {
    const parts = field.split('.');
    let value: any = { request, metadata };
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private async checkThreatIntelligence(
    request: SecurityRequest,
    metadata: ThreatMetadata
  ): Promise<ThreatEvent[]> {
    const threats: ThreatEvent[] = [];
    
    // Check IP address
    const ipIntel = this.threatIntel.get(metadata.ipAddress);
    if (ipIntel) {
      threats.push({
        id: uuidv4(),
        type: ThreatType.RECONNAISSANCE,
        severity: ipIntel.severity,
        source: metadata.ipAddress,
        target: request.url,
        description: `Known malicious IP: ${ipIntel.description}`,
        indicators: [{
          type: IndicatorType.IP_ADDRESS,
          value: metadata.ipAddress,
          confidence: ipIntel.confidence,
          source: ipIntel.source,
        }],
        metadata,
        timestamp: new Date(),
        resolved: false,
      });
    }
    
    // Check URL patterns
    const urlIntel = Array.from(this.threatIntel.values())
      .find(intel => intel.type === IndicatorType.URL && request.url.includes(intel.value));
    
    if (urlIntel) {
      threats.push({
        id: uuidv4(),
        type: ThreatType.VULNERABILITY_EXPLOIT,
        severity: urlIntel.severity,
        source: metadata.ipAddress,
        target: request.url,
        description: `Suspicious URL pattern: ${urlIntel.description}`,
        indicators: [{
          type: IndicatorType.URL,
          value: request.url,
          confidence: urlIntel.confidence,
          source: urlIntel.source,
        }],
        metadata,
        timestamp: new Date(),
        resolved: false,
      });
    }
    
    return threats;
  }

  private async analyzeBehavior(
    request: SecurityRequest,
    metadata: ThreatMetadata
  ): Promise<ThreatEvent[]> {
    const threats: ThreatEvent[] = [];
    
    if (!metadata.session?.userId) {
      return threats;
    }
    
    const profile = this.behaviorProfiles.get(metadata.session.userId);
    if (!profile) {
      return threats;
    }
    
    // Analyze location anomalies
    if (metadata.location && profile.locations.length > 0) {
      const isLocationAnomalous = this.isLocationAnomalous(metadata.location, profile.locations);
      if (isLocationAnomalous) {
        threats.push({
          id: uuidv4(),
          type: ThreatType.SUSPICIOUS_LOGIN,
          severity: ThreatSeverity.MEDIUM,
          source: metadata.ipAddress,
          target: request.url,
          description: 'Login from unusual location',
          indicators: [{
            type: IndicatorType.IP_ADDRESS,
            value: metadata.ipAddress,
            confidence: 0.7,
            source: 'behavior_analysis',
          }],
          metadata,
          timestamp: new Date(),
          resolved: false,
        });
      }
    }
    
    // Analyze time-based anomalies
    const isTimeAnomalous = this.isTimeAnomalous(new Date(), profile.activeTimes);
    if (isTimeAnomalous) {
      threats.push({
        id: uuidv4(),
        type: ThreatType.ANOMALOUS_BEHAVIOR,
        severity: ThreatSeverity.LOW,
        source: metadata.ipAddress,
        target: request.url,
        description: 'Activity at unusual time',
        indicators: [{
          type: IndicatorType.PATTERN,
          value: 'unusual_time',
          confidence: 0.6,
          source: 'behavior_analysis',
        }],
        metadata,
        timestamp: new Date(),
        resolved: false,
      });
    }
    
    return threats;
  }

  private async updateBehaviorProfile(request: SecurityRequest, metadata: ThreatMetadata): Promise<void> {
    if (!metadata.session?.userId) {
      return;
    }
    
    const userId = metadata.session.userId;
    let profile = this.behaviorProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        locations: [],
        devices: [],
        activeTimes: [],
        requestPatterns: [],
        lastUpdated: new Date(),
      };
    }
    
    // Update location
    if (metadata.location) {
      const existingLocation = profile.locations.find(loc => 
        loc.country === metadata.location!.country && 
        loc.city === metadata.location!.city
      );
      
      if (!existingLocation) {
        profile.locations.push({
          ...metadata.location,
          firstSeen: new Date(),
          lastSeen: new Date(),
          count: 1,
        });
      } else {
        existingLocation.lastSeen = new Date();
        existingLocation.count++;
      }
    }
    
    // Update device
    if (metadata.device) {
      const existingDevice = profile.devices.find(dev => 
        dev.os === metadata.device!.os && 
        dev.browser === metadata.device!.browser
      );
      
      if (!existingDevice) {
        profile.devices.push({
          ...metadata.device,
          firstSeen: new Date(),
          lastSeen: new Date(),
          count: 1,
        });
      } else {
        existingDevice.lastSeen = new Date();
        existingDevice.count++;
      }
    }
    
    // Update active times
    const hour = new Date().getHours();
    const existingTime = profile.activeTimes.find(time => time.hour === hour);
    
    if (!existingTime) {
      profile.activeTimes.push({
        hour,
        count: 1,
        lastSeen: new Date(),
      });
    } else {
      existingTime.count++;
      existingTime.lastSeen = new Date();
    }
    
    profile.lastUpdated = new Date();
    this.behaviorProfiles.set(userId, profile);
  }

  private calculateRiskScore(threats: ThreatEvent[]): number {
    if (threats.length === 0) return 0;
    
    const severityWeights = {
      [ThreatSeverity.LOW]: 1,
      [ThreatSeverity.MEDIUM]: 3,
      [ThreatSeverity.HIGH]: 7,
      [ThreatSeverity.CRITICAL]: 10,
    };
    
    const totalScore = threats.reduce((sum, threat) => {
      return sum + severityWeights[threat.severity];
    }, 0);
    
    return Math.min(totalScore / threats.length, 10);
  }

  private determineActions(threats: ThreatEvent[]): RuleAction[] {
    const actions: RuleAction[] = [];
    
    const hasCritical = threats.some(t => t.severity === ThreatSeverity.CRITICAL);
    const hasHigh = threats.some(t => t.severity === ThreatSeverity.HIGH);
    
    if (hasCritical) {
      actions.push({ type: ActionType.BLOCK, parameters: {} });
      actions.push({ type: ActionType.ALERT, parameters: { priority: 'critical' } });
    } else if (hasHigh) {
      actions.push({ type: ActionType.RATE_LIMIT, parameters: { limit: 10, window: 300 } });
      actions.push({ type: ActionType.ALERT, parameters: { priority: 'high' } });
    } else if (threats.length > 0) {
      actions.push({ type: ActionType.LOG, parameters: {} });
    }
    
    return actions;
  }

  private mapRuleTypeToThreatType(ruleType: RuleType): ThreatType {
    const mapping = {
      [RuleType.RATE_LIMIT]: ThreatType.DDoS,
      [RuleType.PATTERN_MATCH]: ThreatType.VULNERABILITY_EXPLOIT,
      [RuleType.ANOMALY_DETECTION]: ThreatType.ANOMALOUS_BEHAVIOR,
      [RuleType.BLACKLIST]: ThreatType.RECONNAISSANCE,
      [RuleType.WHITELIST]: ThreatType.RECONNAISSANCE,
      [RuleType.BEHAVIORAL]: ThreatType.ANOMALOUS_BEHAVIOR,
      [RuleType.SIGNATURE]: ThreatType.MALWARE,
    };
    
    return mapping[ruleType] || ThreatType.RECONNAISSANCE;
  }

  private isLocationAnomalous(
    currentLocation: { country: string; city: string },
    knownLocations: Array<{ country: string; city: string; count: number }>
  ): boolean {
    // Consider location anomalous if it's not in the top 3 most frequent locations
    const sortedLocations = knownLocations
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    return !sortedLocations.some(loc => 
      loc.country === currentLocation.country && 
      loc.city === currentLocation.city
    );
  }

  private isTimeAnomalous(currentTime: Date, activeTimes: Array<{ hour: number; count: number }>): boolean {
    const currentHour = currentTime.getHours();
    const timeProfile = activeTimes.find(time => time.hour === currentHour);
    
    if (!timeProfile) {
      return true; // Never seen at this hour
    }
    
    // Consider anomalous if this hour has less than 10% of total activity
    const totalActivity = activeTimes.reduce((sum, time) => sum + time.count, 0);
    const hourPercentage = timeProfile.count / totalActivity;
    
    return hourPercentage < 0.1;
  }

  private async loadSecurityRules(): Promise<void> {
    // TODO: Load from database
    // For now, create some default rules
    
    const defaultRules: Omit<SecurityRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Brute Force Detection',
        description: 'Detect brute force login attempts',
        type: RuleType.RATE_LIMIT,
        severity: ThreatSeverity.HIGH,
        conditions: [
          {
            field: 'request.url',
            operator: ConditionOperator.CONTAINS,
            value: '/auth/login',
          },
          {
            field: 'metadata.ipAddress',
            operator: ConditionOperator.EXISTS,
            value: null,
            threshold: 5,
            timeWindow: 300, // 5 minutes
          },
        ],
        actions: [
          { type: ActionType.BLOCK, parameters: { duration: 3600 } },
          { type: ActionType.ALERT, parameters: { priority: 'high' } },
        ],
        enabled: true,
      },
      {
        name: 'SQL Injection Detection',
        description: 'Detect SQL injection attempts',
        type: RuleType.PATTERN_MATCH,
        severity: ThreatSeverity.CRITICAL,
        conditions: [
          {
            field: 'request.body',
            operator: ConditionOperator.MATCHES,
            value: '(union|select|insert|update|delete|drop|exec|script)',
          },
        ],
        actions: [
          { type: ActionType.BLOCK, parameters: {} },
          { type: ActionType.ALERT, parameters: { priority: 'critical' } },
        ],
        enabled: true,
      },
    ];
    
    for (const ruleData of defaultRules) {
      await this.createRule(ruleData);
    }
  }

  private async loadThreatIntelligence(): Promise<void> {
    // TODO: Load from threat intelligence feeds
    // This would integrate with services like VirusTotal, AbuseIPDB, etc.
  }

  private async updateThreatIntelligence(): Promise<void> {
    // TODO: Update threat intelligence from external sources
  }

  private async analyzeBehaviorPatterns(): Promise<void> {
    // TODO: Analyze behavior patterns and update profiles
  }
}

// Supporting interfaces
interface SecurityRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  ipAddress: string;
  session?: {
    id: string;
    userId?: string;
    createdAt: string;
  };
}

interface ThreatAnalysisResult {
  requestId: string;
  riskScore: number;
  threats: ThreatEvent[];
  blocked: boolean;
  actions: RuleAction[];
  analysisTime: number;
  timestamp: Date;
}

interface UserBehaviorProfile {
  userId: string;
  locations: Array<{
    country: string;
    region: string;
    city: string;
    coordinates: [number, number];
    firstSeen: Date;
    lastSeen: Date;
    count: number;
  }>;
  devices: Array<{
    type: string;
    os: string;
    browser: string;
    version: string;
    firstSeen: Date;
    lastSeen: Date;
    count: number;
  }>;
  activeTimes: Array<{
    hour: number;
    count: number;
    lastSeen: Date;
  }>;
  requestPatterns: Array<{
    pattern: string;
    count: number;
    lastSeen: Date;
  }>;
  lastUpdated: Date;
}
