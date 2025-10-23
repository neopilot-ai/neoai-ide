"use server";

import { faker } from '@faker-js/faker';

export interface MergeRequest {
  id: number;
  title: string;
  projectName: string;
  linesChanged: number;
  createdAt: string;
}

export interface Project {
  id: number;
  name: string;
  role: 'Maintainer' | 'Reviewer' | 'None';
  lastActivity: string;
}

export async function generateMockMergeRequests(count: number): Promise<MergeRequest[]> {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: faker.git.commitMessage(),
    projectName: faker.company.name(),
    linesChanged: faker.number.int({ min: 1, max: 1000 }),
    createdAt: faker.date.recent().toISOString(),
  }));
}

export async function generateMockProjects(count: number): Promise<Project[]> {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: faker.company.name(),
    role: faker.helpers.arrayElement(['Maintainer', 'Reviewer', 'None'] as const),
    lastActivity: faker.date.recent().toISOString(),
  }));
}

export async function generateMockSummary(): Promise<string> {
  return `
## Achievements Summary

### Project Contributions
${faker.lorem.paragraph()}

### Key Merge Requests
${faker.lorem.paragraph()}

### Skills Demonstrated
- ${faker.lorem.sentence()}
- ${faker.lorem.sentence()}
- ${faker.lorem.sentence()}

### Impact
${faker.lorem.paragraph()}
  `;
}
