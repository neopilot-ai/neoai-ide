"use server";

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { callAnthropic } from "../../anthropic";

const QUIZ_MODEL = 'claude-sonnet-4-0';
const QUIZ_MAX_OUTPUT_TOKENS = 8192;

export type FlashCard = {
  question: string;
  answer: string;
};

function parseXMLResponse(xmlString: string): FlashCard[] {
  const cards: FlashCard[] = [];
  
  // Find all item tags
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const items = xmlString.match(itemRegex);
  
  if (!items) {
    throw new Error("No quiz questions found in response");
  }

  items.forEach(item => {
    // Extract individual fields using regex
    const getTagContent = (tag: string) => {
      const match = item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`, 's'));
      return match ? match[1].trim() : '';
    };

    const question = getTagContent('question');
    const answer = getTagContent('answer');
    
    cards.push({
      question,
      answer
    });
  });

  return cards;
}

export async function getFlashCards(topic: string, level: string, background: string): Promise<FlashCard[] | undefined> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return;
  }

  const prompt = `
  You are an expert software developer who has read and understood the NeoAi user handbook and best practices.

  The user has read and understood the following topic:
    
  <topic>${topic}</topic>

  Based on that could you please create flash cards that will verify their understanding of the topic.
  Please come up with 4-5 flash cards. The questions should be in order of difficulty.
  Questions based on real world usage would be ideal. 

  The quiz should be based on the level and background of the user as shown below:
  ----
  <user_level>${level}</user_level>
  <background>${background}</background>
  ----

  Please respond in the following format:

  <item>
    <question>A question based on the topic above</question>
    <answer>A answer to the question above</answer>
  </item>`;

  try {
    const response = await callAnthropic(
      prompt,
      QUIZ_MODEL,
      QUIZ_MAX_OUTPUT_TOKENS
    );

    return parseXMLResponse(response);
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
}