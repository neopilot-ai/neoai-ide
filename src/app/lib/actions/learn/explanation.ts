"use server";

import { getServerSession } from "next-auth";
import { callAnthropic } from "../../anthropic";
import { trackRun } from "../../telemetry";

const EXPLANATION_MODEL = 'claude-sonnet-4-0';
const EXPLANATION_MAX_OUTPUT_TOKENS = 8192;

export async function fetchTopicExplanation(topic: string, level: string, background: string, type: string, previousExplanation?: string) : Promise<string | undefined> {
  const session = await getServerSession();
  if (!session) {
    return;
  }

  const { user } = session;
  
  trackRun(user?.name, user?.email, level, 'learn')
    .catch(e => console.error('Could not track run:', e))

  let previousExplanationPrompt = '';
  if (previousExplanation) {
    previousExplanationPrompt = `
      The user has asked to modify the previous explanation to be ${type}. Here's the previous explanation:
      -----
      ${previousExplanation}
      -----
    `;
  }

  const prompt = `
  You are an expert software developer who has read and understood the NeoAi user handbook and best practices.

  Could you provide an explanation of the following topic
  
  <topic>${topic}</topic>


  The level of explanation should match the below level and must incorporate the provided background
  ----
  <user_level>${level}</user_level>
  <background>${background}</background>
  ----

  ${previousExplanationPrompt}}

  <formatting>
  Please respond in Markdown. Please make sure the explanation is formatted for easy reading and comprehension.
  You can divide the explanation into section headers to make it easy to read.
  At the end of the explanation, provide a summary section that highlights the key points of the explanation.
  </formatting>
  `

  const response = await callAnthropic(
    prompt,
    EXPLANATION_MODEL,
    EXPLANATION_MAX_OUTPUT_TOKENS
  );

  return response;
}