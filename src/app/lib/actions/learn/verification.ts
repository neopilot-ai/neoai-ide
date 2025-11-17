"use server";

import { getServerSession } from "next-auth";
import { callAnthropic } from "../../anthropic";

const VERIFICATION_MODEL = 'claude-sonnet-4-0';
const VERIFICATION_MAX_OUTPUT_TOKENS = 8192;

export async function getVerification(topic: string, level: string, background: string, explanation: string) : Promise<string | undefined> {
  const session = await getServerSession();
  if (!session) {
    return;
  }

  const prompt = `
  You are an expert software developer who has read and understood the NeoAi user handbook and best practices.

  The user has read and understood the following topic:
  
  <topic>${topic}</topic>

  The level and background of the user is as follows
  ----
  <user_level>${level}</user_level>
  <background>${background}</background>
  ----

  Based on the topic the user was asked to summarise their understanding of the topic. This is the explanation that they have provided:

  <explanation>${explanation}</explanation>
  
  Could you please verify if the user understands the topic correctly.

  Keep the following in mind:
  1. Be encouraging and support the user
  2. Be friendly in your tone
  3. Focus on helping the user understand the topic
  4. Respond bopth with what the user understood correctly and where they need help

  <formatting>
  Please respond in Markdown.
  </formatting>
  `

  const response = await callAnthropic(
    prompt,
    VERIFICATION_MODEL,
    VERIFICATION_MAX_OUTPUT_TOKENS
  );

  return response;
}