import { RunnableConfig } from "@langchain/core/runnables";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { convertJsonSchemaToZodSchema, randomId, NeoPilotMisuseError } from "@neopilot/shared";
import { Annotation, MessagesAnnotation, interrupt } from "@langchain/langgraph";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { AIMessage } from "@langchain/core/messages";

interface IntermediateStateConfig {
  stateKey: string;
  tool: string;
  toolArgument?: string;
}

interface OptionsConfig {
  emitToolCalls?: boolean | string | string[];
  emitMessages?: boolean;
  emitAll?: boolean;
  emitIntermediateState?: IntermediateStateConfig[];
}

export const NeoPilotPropertiesAnnotation = Annotation.Root({
  actions: Annotation<any[]>,
  context: Annotation<{ description: string; value: string }[]>,
});

export const NeoPilotStateAnnotation = Annotation.Root({
  neopilot: Annotation<typeof NeoPilotPropertiesAnnotation.State>,
  ...MessagesAnnotation.spec,
});

export type NeoPilotState = typeof NeoPilotStateAnnotation.State;
export type NeoPilotProperties = typeof NeoPilotPropertiesAnnotation.State;

/**
 * Customize the LangGraph configuration for use in NeoPilot.
 *
 * To the NeoPilot SDK, run:
 *
 * ```bash
 * npm install @neopilot/sdk-js
 * ```
 *
 * ### Examples
 *
 * Disable emitting messages and tool calls:
 *
 * ```typescript
 * import { neopilotCustomizeConfig } from "@neopilot/sdk-js";
 *
 * config = neopilotCustomizeConfig(
 *   config,
 *   emitMessages=false,
 *   emitToolCalls=false
 * )
 * ```
 *
 * To emit a tool call as streaming LangGraph state, pass the destination key in state,
 * the tool name and optionally the tool argument. (If you don't pass the argument name,
 * all arguments are emitted under the state key.)
 *
 * ```typescript
 * import { neopilotCustomizeConfig } from "@neopilot/sdk-js";
 *
 * config = neopilotCustomizeConfig(
 *   config,
 *   emitIntermediateState=[
 *     {
 *       "stateKey": "steps",
 *       "tool": "SearchTool",
 *       "toolArgument": "steps",
 *     },
 *   ],
 * )
 * ```
 */
export function neopilotCustomizeConfig(
  /**
   * The LangChain/LangGraph configuration to customize.
   */
  baseConfig: RunnableConfig,
  /**
   * Configuration options:
   * - `emitMessages: boolean?`
   *   Configure how messages are emitted. By default, all messages are emitted. Pass false to
   *   disable emitting messages.
   * - `emitToolCalls: boolean | string | string[]?`
   *   Configure how tool calls are emitted. By default, all tool calls are emitted. Pass false to
   *   disable emitting tool calls. Pass a string or list of strings to emit only specific tool calls.
   * - `emitIntermediateState: IntermediateStateConfig[]?`
   *   Lets you emit tool calls as streaming LangGraph state.
   */
  options?: OptionsConfig,
): RunnableConfig {
  if (baseConfig && typeof baseConfig !== "object") {
    throw new NeoPilotMisuseError({
      message: "baseConfig must be an object or null/undefined",
    });
  }

  if (options && typeof options !== "object") {
    throw new NeoPilotMisuseError({
      message: "options must be an object when provided",
    });
  }

  // Validate emitIntermediateState structure
  if (options?.emitIntermediateState) {
    if (!Array.isArray(options.emitIntermediateState)) {
      throw new NeoPilotMisuseError({
        message: "emitIntermediateState must be an array when provided",
      });
    }

    options.emitIntermediateState.forEach((state, index) => {
      if (!state || typeof state !== "object") {
        throw new NeoPilotMisuseError({
          message: `emitIntermediateState[${index}] must be an object`,
        });
      }

      if (!state.stateKey || typeof state.stateKey !== "string") {
        throw new NeoPilotMisuseError({
          message: `emitIntermediateState[${index}] must have a valid 'stateKey' string property`,
        });
      }

      if (!state.tool || typeof state.tool !== "string") {
        throw new NeoPilotMisuseError({
          message: `emitIntermediateState[${index}] must have a valid 'tool' string property`,
        });
      }

      if (state.toolArgument && typeof state.toolArgument !== "string") {
        throw new NeoPilotMisuseError({
          message: `emitIntermediateState[${index}].toolArgument must be a string when provided`,
        });
      }
    });
  }

  try {
    const metadata = baseConfig?.metadata || {};

    if (options?.emitAll) {
      metadata["neopilot:emit-tool-calls"] = true;
      metadata["neopilot:emit-messages"] = true;
    } else {
      if (options?.emitToolCalls !== undefined) {
        metadata["neopilot:emit-tool-calls"] = options.emitToolCalls;
      }
      if (options?.emitMessages !== undefined) {
        metadata["neopilot:emit-messages"] = options.emitMessages;
      }
    }

    if (options?.emitIntermediateState) {
      const snakeCaseIntermediateState = options.emitIntermediateState.map((state) => ({
        tool: state.tool,
        tool_argument: state.toolArgument,
        state_key: state.stateKey,
      }));

      metadata["neopilot:emit-intermediate-state"] = snakeCaseIntermediateState;
    }

    baseConfig = baseConfig || {};

    return {
      ...baseConfig,
      metadata: metadata,
    };
  } catch (error) {
    throw new NeoPilotMisuseError({
      message: `Failed to customize config: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
/**
 * Exits the current agent after the run completes. Calling neopilot_exit() will
 * not immediately stop the agent. Instead, it signals to NeoPilot to stop the agent after
 * the run completes.
 *
 * ### Examples
 *
 * ```typescript
 * import { neopilotExit } from "@neopilot/sdk-js";
 *
 * async function myNode(state: Any):
 *   await neopilotExit(config)
 *   return state
 * ```
 */
export async function neopilotExit(
  /**
   * The LangChain/LangGraph configuration.
   */
  config: RunnableConfig,
) {
  if (!config) {
    throw new NeoPilotMisuseError({
      message: "LangGraph configuration is required for neopilotExit",
    });
  }

  try {
    await dispatchCustomEvent("neopilot_exit", {}, config);
  } catch (error) {
    throw new NeoPilotMisuseError({
      message: `Failed to dispatch exit event: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
/**
 * Emits intermediate state to NeoPilot. Useful if you have a longer running node and you want to
 * update the user with the current state of the node.
 *
 * ### Examples
 *
 * ```typescript
 * import { neopilotEmitState } from "@neopilot/sdk-js";
 *
 * for (let i = 0; i < 10; i++) {
 *   await someLongRunningOperation(i);
 *   await neopilotEmitState(config, { progress: i });
 * }
 * ```
 */
export async function neopilotEmitState(
  /**
   * The LangChain/LangGraph configuration.
   */
  config: RunnableConfig,
  /**
   * The state to emit.
   */
  state: any,
) {
  if (!config) {
    throw new NeoPilotMisuseError({
      message: "LangGraph configuration is required for neopilotEmitState",
    });
  }

  if (state === undefined) {
    throw new NeoPilotMisuseError({
      message: "State is required for neopilotEmitState",
    });
  }

  try {
    await dispatchCustomEvent("neopilot_manually_emit_intermediate_state", state, config);
  } catch (error) {
    throw new NeoPilotMisuseError({
      message: `Failed to emit state: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
/**
 * Manually emits a message to NeoPilot. Useful in longer running nodes to update the user.
 * Important: You still need to return the messages from the node.
 *
 * ### Examples
 *
 * ```typescript
 * import { neopilotEmitMessage } from "@neopilot/sdk-js";
 *
 * const message = "Step 1 of 10 complete";
 * await neopilotEmitMessage(config, message);
 *
 * // Return the message from the node
 * return {
 *   "messages": [AIMessage(content=message)]
 * }
 * ```
 */
export async function neopilotEmitMessage(
  /**
   * The LangChain/LangGraph configuration.
   */
  config: RunnableConfig,
  /**
   * The message to emit.
   */
  message: string,
) {
  if (!config) {
    throw new NeoPilotMisuseError({
      message: "LangGraph configuration is required for neopilotEmitMessage",
    });
  }

  if (!message || typeof message !== "string") {
    throw new NeoPilotMisuseError({
      message: "Message must be a non-empty string for neopilotEmitMessage",
    });
  }

  try {
    await dispatchCustomEvent(
      "neopilot_manually_emit_message",
      { message, message_id: randomId(), role: "assistant" },
      config,
    );
  } catch (error) {
    throw new NeoPilotMisuseError({
      message: `Failed to emit message: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
/**
 * Manually emits a tool call to NeoPilot.
 *
 * ### Examples
 *
 * ```typescript
 * import { neopilotEmitToolCall } from "@neopilot/sdk-js";
 *
 * await neopilotEmitToolCall(config, name="SearchTool", args={"steps": 10})
 * ```
 */
export async function neopilotEmitToolCall(
  /**
   * The LangChain/LangGraph configuration.
   */
  config: RunnableConfig,
  /**
   * The name of the tool to emit.
   */
  name: string,
  /**
   * The arguments to emit.
   */
  args: any,
) {
  if (!config) {
    throw new NeoPilotMisuseError({
      message: "LangGraph configuration is required for neopilotEmitToolCall",
    });
  }

  if (!name || typeof name !== "string") {
    throw new NeoPilotMisuseError({
      message: "Tool name must be a non-empty string for neopilotEmitToolCall",
    });
  }

  if (args === undefined) {
    throw new NeoPilotMisuseError({
      message: "Tool arguments are required for neopilotEmitToolCall",
    });
  }

  try {
    await dispatchCustomEvent(
      "neopilot_manually_emit_tool_call",
      { name, args, id: randomId() },
      config,
    );
  } catch (error) {
    throw new NeoPilotMisuseError({
      message: `Failed to emit tool call '${name}': ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export function convertActionToDynamicStructuredTool(actionInput: any): DynamicStructuredTool<any> {
  if (!actionInput) {
    throw new NeoPilotMisuseError({
      message: "Action input is required but was not provided",
    });
  }

  if (!actionInput.name || typeof actionInput.name !== "string") {
    throw new NeoPilotMisuseError({
      message: "Action must have a valid 'name' property of type string",
    });
  }

  if (
    actionInput.description == undefined ||
    actionInput.description == null ||
    typeof actionInput.description !== "string"
  ) {
    throw new NeoPilotMisuseError({
      message: `Action '${actionInput.name}' must have a valid 'description' property of type string`,
    });
  }

  if (!actionInput.parameters) {
    throw new NeoPilotMisuseError({
      message: `Action '${actionInput.name}' must have a 'parameters' property`,
    });
  }

  try {
    return new DynamicStructuredTool({
      name: actionInput.name,
      description: actionInput.description,
      schema: convertJsonSchemaToZodSchema(actionInput.parameters, true),
      func: async () => {
        return "";
      },
    });
  } catch (error) {
    throw new NeoPilotMisuseError({
      message: `Failed to convert action '${actionInput.name}' to DynamicStructuredTool: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
/**
 * Use this function to convert a list of actions you get from state
 * to a list of dynamic structured tools.
 *
 * ### Examples
 *
 * ```typescript
 * import { convertActionsToDynamicStructuredTools } from "@neopilot/sdk-js";
 *
 * const tools = convertActionsToDynamicStructuredTools(state.neopilot.actions);
 * ```
 */
export function convertActionsToDynamicStructuredTools(
  /**
   * The list of actions to convert.
   */
  actions: any[],
): DynamicStructuredTool<any>[] {
  if (!Array.isArray(actions)) {
    throw new NeoPilotMisuseError({
      message: "Actions must be an array",
    });
  }

  return actions.map((action, index) => {
    try {
      return convertActionToDynamicStructuredTool(
        action.type === "function" ? action.function : action,
      );
    } catch (error) {
      throw new NeoPilotMisuseError({
        message: `Failed to convert action at index ${index}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });
}

export function neoPilotInterrupt({
  message,
  action,
  args,
}: {
  message?: string;
  action?: string;
  args?: Record<string, any>;
}) {
  if (!message && !action) {
    throw new NeoPilotMisuseError({
      message:
        "Either message or action (and optional arguments) must be provided for neoPilotInterrupt",
    });
  }

  if (action && typeof action !== "string") {
    throw new NeoPilotMisuseError({
      message: "Action must be a string when provided to neoPilotInterrupt",
    });
  }

  if (message && typeof message !== "string") {
    throw new NeoPilotMisuseError({
      message: "Message must be a string when provided to neoPilotInterrupt",
    });
  }

  if (args && typeof args !== "object") {
    throw new NeoPilotMisuseError({
      message: "Args must be an object when provided to neoPilotInterrupt",
    });
  }

  let interruptValues = null;
  let interruptMessage = null;
  let answer = null;

  try {
    if (message) {
      interruptValues = message;
      interruptMessage = new AIMessage({ content: message, id: randomId() });
    } else {
      const toolId = randomId();
      interruptMessage = new AIMessage({
        content: "",
        tool_calls: [{ id: toolId, name: action, args: args ?? {} }],
      });
      interruptValues = {
        action,
        args: args ?? {},
      };
    }

    const response = interrupt({
      __neopilot_interrupt_value__: interruptValues,
      __neopilot_messages__: [interruptMessage],
    });
    answer = response[response.length - 1].content;

    return {
      answer,
      messages: response,
    };
  } catch (error) {
    throw new NeoPilotMisuseError({
      message: `Failed to create interrupt: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
