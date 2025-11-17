"use server";

import { getServerSession } from "next-auth";
import { callAnthropic } from "../../anthropic";

const QUIZ_MODEL = 'claude-sonnet-4-0';
const QUIZ_MAX_OUTPUT_TOKENS = 8192;

export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

function parseXMLResponse(xmlString: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  
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
    const optionA = getTagContent('optionA');
    const optionB = getTagContent('optionB');
    const optionC = getTagContent('optionC');
    const optionD = getTagContent('optionD');
    const explanation = getTagContent('explanation');
    
    // Extract correct answer and remove curly braces
    const correctAnswerMatch = getTagContent('correctAnswer').match(/[ABCD]/);
    const correctAnswer = correctAnswerMatch ? correctAnswerMatch[0] : '';

    if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !explanation) {
      throw new Error("Missing required fields in quiz question");
    }

    questions.push({
      question,
      options: [optionA, optionB, optionC, optionD],
      correctAnswer,
      explanation
    });
  });

  return questions;
}

export async function getQuiz(topic: string, level: string, background: string): Promise<QuizQuestion[] | undefined> {
  const session = await getServerSession();
  if (!session) {
    console.log('getQuiz - session issue')
    return;
  }

  const prompt = `
  You are an expert software developer who has read and understood the NeoAi user handbook and best practices.

  The user has read and understood the following topic:
    
  <topic>${topic}</topic>

  Based on that could you please provide multiple choice quiz questions that will verify their understand of the topic.
  Please come up with 4-5 questions. The questions should be in order of difficulty.
  Questions based on real world usage would be ideal. 

  The quiz should be based on the level and background of the user as shown below:
  ----
  <user_level>${level}</user_level>
  <background>${background}</background>
  ----

  Please respond in the following format:

  <item>
    <question>A question based on the topic above</question>
    <optionA>The first option for the question above</optionA>
    <optionB>The second option for the question above</optionB>
    <optionC>The third option for the question above</optionC>
    <optionD>The fourth option for the question above</optionD>
    <correctAnswer>The correct answer for the question above, in format {A,B,C,D}</correctAnswer>
    <explanation>A few lines explaining why this is the correct answer and how the incorrect answer options are incorrect. </explanation>
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