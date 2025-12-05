import { Annotation } from "@langchain/langgraph";
import { NeoPilotStateAnnotation } from "@neopilot/sdk-js/langgraph";

// Define the AgentState annotation, extending MessagesState
export const AgentStateAnnotation = Annotation.Root({
  model: Annotation<string>,
  name: Annotation<string>,
  ...NeoPilotStateAnnotation.spec,
});

export type AgentState = typeof AgentStateAnnotation.State;
