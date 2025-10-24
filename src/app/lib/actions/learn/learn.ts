import { FlashCard } from "./flashcards";
import { QuizQuestion } from "./quiz";

export interface Learn {
  topic: string;
  explanation?: string;
  complexity?: string;
  codeExamples?: string;
  assignments?: string;
  quiz?: QuizQuestion[];
  flashCards?: FlashCard[];
  relatedTopics?: string;
}