import { logger } from '../utils/logger';
import neo4j, { Driver, Session } from 'neo4j-driver';

export interface KnowledgeNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relationship: string;
  properties: Record<string, any>;
}

export class KnowledgeGraph {
  private driver: Driver;

  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      )
    );
  }

  async initialize(): Promise<void> {
    try {
      await this.driver.verifyConnectivity();
      logger.info('Knowledge Graph (Neo4j) connected.');
      await this.ensureIndexes();
    } catch (error) {
      logger.error('Failed to connect to Knowledge Graph:', error);
      throw error;
    }
  }

  private async ensureIndexes(): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run('CREATE INDEX ON :Node(id) IF NOT EXISTS');
      await session.run('CREATE INDEX ON :Node(label) IF NOT EXISTS');
    } finally {
      await session.close();
    }
  }

  public async addFact(fact: { subject: string, predicate: string, object: string }): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        'MERGE (s:Node {label: $subject}) MERGE (o:Node {label: $object}) MERGE (s)-[:REL {type: $predicate}]->(o)',
        fact
      );
      logger.debug(`Fact added to KG: ${fact.subject} -> ${fact.predicate} -> ${fact.object}`);
    } finally {
      await session.close();
    }
  }

  public async query(searchTerm: string): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (n) WHERE n.label CONTAINS $term RETURN n.label as label, n.properties as properties LIMIT 25',
        { term: searchTerm }
      );
      return result.records.map(record => ({ label: record.get('label'), properties: record.get('properties') }));
    } finally {
      await session.close();
    }
  }

  public async findRelationships(nodeLabel: string): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (n {label: $label})-[r]->(m) RETURN n.label, type(r) as relationship, m.label as relatedNode LIMIT 50',
        { label: nodeLabel }
      );
      return result.records.map(record => ({
        source: record.get('n.label'),
        relationship: record.get('relationship'),
        target: record.get('relatedNode'),
      }));
    } finally {
      await session.close();
    }
  }

  public async shutdown(): Promise<void> {
    await this.driver.close();
    logger.info('Knowledge Graph connection closed.');
  }
}
