"use server";

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { callAnthropic } from "../../anthropic";

const RELATED_TOPICS_MODEL = 'claude-sonnet-4-0';
const RELATED_TOPICS_MAX_OUTPUT_TOKENS = 8192;

export async function getRelatedTopics(topic: string, level: string, background: string) : Promise<string | undefined> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return;
  }

  const prompt = `
  You are an expert software developer who has read and understood the NeoAi user handbook and best practices.

  The user has read and understood the following topic:
  
  <topic>${topic}</topic>

  Based on that could you provide a list of related topics and additional resources the user should know about. 

  Provide at least 5 related topics and additional resources the user should know about.

  The resources and topics should be based on the level and background of the user as shown below: 
  ----
  <user_level>${level}</user_level>
  <background>${background}</background>
  ----

  <formatting>
  Please respond in Markdown. Please provide links and reasons why the topic is related.
  Please provide them under two headers - "Related Topics" and "Additional Resources"
  </formatting>
  `

  const response = await callAnthropic(
    prompt,
    RELATED_TOPICS_MODEL,
    RELATED_TOPICS_MAX_OUTPUT_TOKENS
  );

  return response;
}