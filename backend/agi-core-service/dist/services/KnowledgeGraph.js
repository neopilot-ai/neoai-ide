"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeGraph = void 0;
const logger_1 = require("../utils/logger");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
class KnowledgeGraph {
    constructor() {
        this.driver = neo4j_driver_1.default.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'));
    }
    async initialize() {
        try {
            await this.driver.verifyConnectivity();
            logger_1.logger.info('Knowledge Graph (Neo4j) connected.');
            await this.ensureIndexes();
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to Knowledge Graph:', error);
            throw error;
        }
    }
    async ensureIndexes() {
        const session = this.driver.session();
        try {
            await session.run('CREATE INDEX ON :Node(id) IF NOT EXISTS');
            await session.run('CREATE INDEX ON :Node(label) IF NOT EXISTS');
        }
        finally {
            await session.close();
        }
    }
    async addFact(fact) {
        const session = this.driver.session();
        try {
            await session.run('MERGE (s:Node {label: $subject}) MERGE (o:Node {label: $object}) MERGE (s)-[:REL {type: $predicate}]->(o)', fact);
            logger_1.logger.debug(`Fact added to KG: ${fact.subject} -> ${fact.predicate} -> ${fact.object}`);
        }
        finally {
            await session.close();
        }
    }
    async query(searchTerm) {
        const session = this.driver.session();
        try {
            const result = await session.run('MATCH (n) WHERE n.label CONTAINS $term RETURN n.label as label, n.properties as properties LIMIT 25', { term: searchTerm });
            return result.records.map(record => ({ label: record.get('label'), properties: record.get('properties') }));
        }
        finally {
            await session.close();
        }
    }
    async findRelationships(nodeLabel) {
        const session = this.driver.session();
        try {
            const result = await session.run('MATCH (n {label: $label})-[r]->(m) RETURN n.label, type(r) as relationship, m.label as relatedNode LIMIT 50', { label: nodeLabel });
            return result.records.map(record => ({
                source: record.get('n.label'),
                relationship: record.get('relationship'),
                target: record.get('relatedNode'),
            }));
        }
        finally {
            await session.close();
        }
    }
    async shutdown() {
        await this.driver.close();
        logger_1.logger.info('Knowledge Graph connection closed.');
    }
}
exports.KnowledgeGraph = KnowledgeGraph;
