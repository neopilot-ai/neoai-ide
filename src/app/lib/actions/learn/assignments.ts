"use server";

import { getServerSession } from "next-auth";
import { callAnthropic } from "../../anthropic";

const ASSIGNMENTS_MODEL = 'claude-sonnet-4-0';
const ASSIGNMENTS_MAX_OUTPUT_TOKENS = 8192;

export async function getAssignments(topic: string, level: string, background: string) : Promise<string | undefined> {
  const session = await getServerSession();
  if (!session) {
    return;
  }

  const prompt = `
  You are an expert software developer who has read and understood the NeoAi user handbook and best practices.

  The user has read and understood the following topic:
  
  <topic>${topic}</topic>

  Based on that could you please provide some take home code assignments that will help them understand the topic in more detail.

  Please come up with 2 assigments. The first should be basic to verify that they have understood the topic and the second should be advanced.

  Assignments based on real world usage would be ideal. 

  The assignments should be based on the level and background of the user as shown below: 
  ----
  <user_level>${level}</user_level>
  <background>${background}</background>
  ----

  <formatting>
  Please respond in Markdown. Please provide enough detail so that the user can complete the assignment, along with hints for the more advanced assignments.
  Please provide a header indicating the difficuly of the example i.e. Basic, Intermediate, Advanced 
  </formatting>
  `

  const response = await callAnthropic(
    prompt,
    ASSIGNMENTS_MODEL,
    ASSIGNMENTS_MAX_OUTPUT_TOKENS
  );

  return response;
}