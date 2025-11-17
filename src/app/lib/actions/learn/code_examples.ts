"use server";

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { callAnthropic } from "../../anthropic";

const CODE_EXAMPLE_MODEL = 'claude-sonnet-4-0';
const CODE_EXAMPLE_MAX_OUTPUT_TOKENS = 8192;

export async function getCodeExamples(topic: string, level: string, background: string) : Promise<string | undefined> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return;
  }

  const prompt = `
  You are an expert software developer who has read and understood the NeoAi user handbook and best practices.

  Could you provide code examples to that would explain the following topic. 
  
  <topic>${topic}</topic>

  Provide 2-3 code examples (ranging from basic use to advanced). Code examples based on real world usage would be preferred. 

  The code examples should be based on the level and background of the user as shown below: 
  ----
  <user_level>${level}</user_level>
  <background>${background}</background>
  ----

  <formatting>
  Please respond in Markdown. Please provide a detailed explanation for each example.
  Please provide a header indicating the difficuly of the example i.e. Basic, Intermediate, Advanced 
  </formatting>
  `

  const response = await callAnthropic(
    prompt,
    CODE_EXAMPLE_MODEL,
    CODE_EXAMPLE_MAX_OUTPUT_TOKENS
  );

  return response;
}