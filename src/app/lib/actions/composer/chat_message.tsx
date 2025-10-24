export interface ComposerChatMessage {
  sender: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  artifact: string;
  diff: string;
}