"use server";

import { getServerSession } from "next-auth";
import { BlobAnalysis, InsightsBlob } from "../common/entities/blob";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { callAnthropic } from "../../anthropic";

const MODEL = "claude-sonnet-4-0";
const MAX_TOKENS = 8192;

// --------------------------------------------------
// 1. High-level Explanation & Code Flow
// --------------------------------------------------
export async function fetchHighLevelInsights(blob: InsightsBlob): Promise<Pick<BlobAnalysis, "explanation" | "code_flow">> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("No session found. Please log in.");
  }

  const prompt = `
Analyze the following file data from a NeoAi repository. Focus on two areas only:
1) A very detailed explanation of the file, its primary functions, and the overall logic.
2) A Mermaid code flow diagram (graph TD).

Filename: ${blob.path}
Project: ${blob.project}
Contents:
---
${blob.contents}
---

Respond with the following format in Markdown:

<explanation>
  [Write the high-level explanation here]
</explanation>
<codeFlow>
  [Include only a Mermaid diagram here if possible]
</codeFlow>
`;

  const response = await callAnthropic(prompt, MODEL, MAX_TOKENS);

  const explanationMatch = response.match(/<explanation>([\s\S]*?)<\/explanation>/);
  const codeFlowMatch = response.match(/<codeFlow>([\s\S]*?)<\/codeFlow>/);

  return {
    explanation: explanationMatch ? explanationMatch[1].trim() : "Not found.",
    code_flow: codeFlowMatch ? removeMarkdownSyntaxFromMermaid(codeFlowMatch[1].trim()) : "Not found.",
  };
}

// --------------------------------------------------
// 2. Functions & Classes
// --------------------------------------------------
export async function fetchFunctionsAndClasses(blob: InsightsBlob): Promise<Pick<BlobAnalysis, "functions" | "classes">> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("No session found. Please log in.");
  }

  const prompt = `
Analyze the following file data from a NeoAi repository. Focus on:
- A detailed description of each function/method and recommendations for improvements.
- A detailed description of each class/struct/interface.

Filename: ${blob.path}
Project: ${blob.project}
Contents:
---
${blob.contents}
---

Respond with the following format in Markdown:

<functions>
  [Detailed function descriptions, good/bad code analysis, recommended improvements]
</functions>
<classes>
  [Detailed class/struct descriptions, usage, recommendations]
</classes>
`;

  const response = await callAnthropic(prompt, MODEL, MAX_TOKENS);

  const functionsMatch = response.match(/<functions>([\s\S]*?)<\/functions>/);
  const classesMatch = response.match(/<classes>([\s\S]*?)<\/classes>/);

  return {
    functions: functionsMatch ? functionsMatch[1].trim() : "Not found.",
    classes: classesMatch ? classesMatch[1].trim() : "Not found.",
  };
}

// --------------------------------------------------
// 3. Dependencies, Security, Performance, Data
// --------------------------------------------------
export async function fetchOtherInsights(blob: InsightsBlob): Promise<Pick<BlobAnalysis, "dependencies" | "security" | "performance_improvements" | "data_dictionary">> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("No session found. Please log in.");
  }

  const prompt = `
Analyze the following file data from a NeoAi repository. Focus on these four areas:
1) Dependencies
2) Security
3) Performance
4) Data Dictionary

Filename: ${blob.path}
Project: ${blob.project}
Contents:
---
${blob.contents}
---

Respond in the following format in Markdown:

<dependencies>
  [List dependencies and their purpose]
</dependencies>
<security>
  [Security analysis and recommendations]
</security>
<performance>
  [Performance analysis and improvements]
</performance>
<dataDictionary>
  [Models/tables/structs/classes etc. usage details]
</dataDictionary>
`;

  const response = await callAnthropic(prompt, MODEL, MAX_TOKENS);

  const dependenciesMatch = response.match(/<dependencies>([\s\S]*?)<\/dependencies>/);
  const securityMatch = response.match(/<security>([\s\S]*?)<\/security>/);
  const performanceMatch = response.match(/<performance>([\s\S]*?)<\/performance>/);
  const dataDictionaryMatch = response.match(/<dataDictionary>([\s\S]*?)<\/dataDictionary>/);

  return {
    dependencies: dependenciesMatch ? dependenciesMatch[1].trim() : "Not found.",
    security: securityMatch ? securityMatch[1].trim() : "Not found.",
    performance_improvements: performanceMatch ? performanceMatch[1].trim() : "Not found.",
    data_dictionary: dataDictionaryMatch ? dataDictionaryMatch[1].trim() : "Not found.",
  };
}

// --------------------------------------------------
// Helper to remove mermaid code fence blocks
// --------------------------------------------------
function removeMarkdownSyntaxFromMermaid(input: string): string {
  const mermaidBlockRegex = /```mermaid\s*([\s\S]*?)```/g;
  return input.replace(mermaidBlockRegex, (_, codeBlock) => codeBlock.trim());
}
