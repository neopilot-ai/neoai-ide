/**
 * NeoPilot Empty Adapter
 *
 * This adapter is meant to preserve adherence to runtime requirements, while doing nothing
 * Ideal if you don't want to connect an LLM the to the runtime, and only use your LangGraph agent.
 * Be aware that Copilot Suggestions will not work if you use this adapter
 *
 * ## Example
 *
 * ```ts
 * import { CopilotRuntime, EmptyAdapter } from "@neopilot/runtime";
 *
 * const neoPilot = new CopilotRuntime();
 *
 * return new EmptyAdapter();
 * ```
 */
import {
  CopilotServiceAdapter,
  CopilotRuntimeChatCompletionRequest,
  CopilotRuntimeChatCompletionResponse,
} from "../service-adapter";
import { randomUUID } from "@neopilot/shared";

export class EmptyAdapter implements CopilotServiceAdapter {
  async process(
    request: CopilotRuntimeChatCompletionRequest,
  ): Promise<CopilotRuntimeChatCompletionResponse> {
    return {
      threadId: request.threadId || randomUUID(),
    };
  }
}

export const ExperimentalEmptyAdapter = EmptyAdapter;
