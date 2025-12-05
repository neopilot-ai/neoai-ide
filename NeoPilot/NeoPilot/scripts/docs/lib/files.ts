import { ReferenceDocConfiguration } from "./reference-doc";

export const REFERENCE_DOCS: ReferenceDocConfiguration[] = [
  /* Runtime */
  {
    sourcePath: "packages/runtime/src/service-adapters/google/google-genai-adapter.ts",
    destinationPath:
      "docs/content/docs/reference/classes/llm-adapters/GoogleGenerativeAIAdapter.mdx",
    className: "GoogleGenerativeAIAdapter",
    description: "Copilot Runtime adapter for Google Generative AI (e.g. Gemini).",
  },
  {
    sourcePath: "packages/runtime/src/service-adapters/groq/groq-adapter.ts",
    destinationPath: "docs/content/docs/reference/classes/llm-adapters/GroqAdapter.mdx",
    className: "GroqAdapter",
    description: "Copilot Runtime adapter for Groq.",
  },
  {
    sourcePath: "packages/runtime/src/service-adapters/langchain/langchain-adapter.ts",
    destinationPath: "docs/content/docs/reference/classes/llm-adapters/LangChainAdapter.mdx",
    className: "LangChainAdapter",
    description: "Copilot Runtime adapter for LangChain.",
  },
  {
    sourcePath: "packages/runtime/src/service-adapters/openai/openai-adapter.ts",
    destinationPath: "docs/content/docs/reference/classes/llm-adapters/OpenAIAdapter.mdx",
    className: "OpenAIAdapter",
    description: "Copilot Runtime adapter for OpenAI.",
  },
  {
    sourcePath: "packages/runtime/src/service-adapters/openai/openai-assistant-adapter.ts",
    destinationPath: "docs/content/docs/reference/classes/llm-adapters/OpenAIAssistantAdapter.mdx",
    className: "OpenAIAssistantAdapter",
    description: "Copilot Runtime adapter for OpenAI Assistant API.",
  },
  {
    sourcePath: "packages/runtime/src/service-adapters/anthropic/anthropic-adapter.ts",
    destinationPath: "docs/content/docs/reference/classes/llm-adapters/AnthropicAdapter.mdx",
    className: "AnthropicAdapter",
    description: "Copilot Runtime adapter for Anthropic.",
  },
  /* Classes */
  {
    sourcePath: "packages/react-core/src/lib/copilot-task.ts",
    destinationPath: "docs/content/docs/reference/classes/CopilotTask.mdx",
    className: "CopilotTask",
    description: "CopilotTask is used to execute one-off tasks, for example on button click.",
  },
  {
    sourcePath: "packages/runtime/src/lib/runtime/copilot-runtime.ts",
    destinationPath: "docs/content/docs/reference/classes/CopilotRuntime.mdx",
    className: "CopilotRuntime",
    description:
      "Copilot Runtime is the back-end component of NeoPilot, enabling interaction with LLMs.",
  },
  /* Components */
  {
    sourcePath: "packages/react-ui/src/components/chat/Chat.tsx",
    destinationPath: "docs/content/docs/reference/components/chat/CopilotChat.mdx",
    component: "CopilotChat",
    description:
      "The CopilotChat component, providing a chat interface for interacting with your copilot.",
  },
  {
    sourcePath: "packages/react-core/src/components/copilot-provider/neopilot.tsx",
    destinationPath: "docs/content/docs/reference/components/NeoPilot.mdx",
    component: "NeoPilot",
    description: "The NeoPilot provider component, wrapping your application.",
  },
  {
    sourcePath: "packages/react-ui/src/components/chat/Popup.tsx",
    destinationPath: "docs/content/docs/reference/components/chat/CopilotPopup.mdx",
    component: "CopilotPopup",
    description:
      "The CopilotPopup component, providing a popup interface for interacting with your copilot.",
  },
  {
    sourcePath: "packages/react-ui/src/components/chat/Sidebar.tsx",
    destinationPath: "docs/content/docs/reference/components/chat/CopilotSidebar.mdx",
    component: "CopilotSidebar",
    description:
      "The CopilotSidebar component, providing a sidebar interface for interacting with your copilot.",
  },
  {
    sourcePath: "packages/react-textarea/src/components/copilot-textarea/copilot-textarea.tsx",
    destinationPath: "docs/content/docs/reference/components/CopilotTextarea.mdx",
    component: "CopilotTextarea",
    description:
      "An AI-powered textarea component for your application, which serves as a drop-in replacement for any textarea.",
  },
  /* Hooks */
  {
    sourcePath: "packages/react-core/src/hooks/use-copilot-chat.ts",
    destinationPath: "docs/content/docs/reference/hooks/useCopilotChat.mdx",
    hook: "useCopilotChat",
  },
  {
    sourcePath: "packages/react-core/src/hooks/use-copilot-chat-headless_c.ts",
    destinationPath: "docs/content/docs/reference/hooks/useCopilotChatHeadless_c.mdx",
    hook: "useCopilotChatHeadless_c",
  },
  {
    sourcePath: "packages/react-ui/src/hooks/use-copilot-chat-suggestions.tsx",
    destinationPath: "docs/content/docs/reference/hooks/useCopilotChatSuggestions.mdx",
    hook: "useCopilotChatSuggestions",
    description:
      "The useCopilotChatSuggestions hook generates suggestions in the chat window based on real-time app state.",
  },
  {
    sourcePath: "packages/react-core/src/hooks/use-copilot-readable.ts",
    destinationPath: "docs/content/docs/reference/hooks/useCopilotReadable.mdx",
    hook: "useCopilotReadable",
    description:
      "The useCopilotReadable hook allows you to provide knowledge to your copilot (e.g. application state).",
  },
  {
    sourcePath: "packages/react-core/src/hooks/use-coagent-state-render.ts",
    destinationPath: "docs/content/docs/reference/hooks/useCoAgentStateRender.mdx",
    hook: "useCoAgentStateRender",
    description:
      "The useCoAgentStateRender hook allows you to render the state of the agent in the chat.",
  },
  {
    sourcePath: "packages/react-core/src/hooks/use-coagent.ts",
    destinationPath: "docs/content/docs/reference/hooks/useCoAgent.mdx",
    hook: "useCoAgent",
    description:
      "The useCoAgent hook allows you to share state bidirectionally between your application and the agent.",
  },
  {
    sourcePath: "packages/react-core/src/hooks/use-copilot-additional-instructions.ts",
    destinationPath: "docs/content/docs/reference/hooks/useCopilotAdditionalInstructions.mdx",
    hook: "useCopilotAdditionalInstructions",
    description:
      "The useCopilotAdditionalInstructions hook allows you to provide additional instructions to the agent.",
  },
  /* SDKs */

  {
    sourcePath: "../sdk-python/neopilot/langgraph.py",
    destinationPath: "docs/content/docs/reference/sdk/python/LangGraph.mdx",
    title: "LangGraph SDK",
    description:
      "The NeoPilot LangGraph SDK for Python allows you to build and run LangGraph workflows with NeoPilot.",
    pythonSymbols: [
      "neopilot_customize_config",
      "neopilot_exit",
      "neopilot_emit_state",
      "neopilot_emit_message",
      "neopilot_emit_tool_call",
    ],
  },
  {
    sourcePath: "../sdk-python/neopilot/crewai/crewai_sdk.py",
    destinationPath: "docs/content/docs/reference/sdk/python/CrewAI.mdx",
    title: "CrewAI SDK",
    description:
      "The NeoPilot CrewAI SDK for Python allows you to build and run CrewAI agents with NeoPilot.",
    pythonSymbols: [
      "neopilot_emit_state",
      "neopilot_predict_state",
      "neopilot_exit",
      "neopilot_emit_message",
      "neopilot_emit_tool_call",
    ],
  },

  /* Agents */
  {
    sourcePath: "../sdk-python/neopilot/langgraph_agent.py",
    destinationPath: "docs/content/docs/reference/sdk/python/LangGraphAgent.mdx",
    title: "LangGraphAgent",
    description: "LangGraphAgent lets you define your agent for use with NeoPilot.",
    pythonSymbols: ["LangGraphAgent", "NeoPilotConfig"],
  },
  {
    sourcePath: "../sdk-python/neopilot/crewai/crewai_agent.py",
    destinationPath: "docs/content/docs/reference/sdk/python/CrewAIAgent.mdx",
    title: "CrewAIAgent",
    description: "CrewAIAgent lets you define your agent for use with NeoPilot.",
    pythonSymbols: ["CrewAIAgent", "NeoPilotConfig"],
  },
  {
    sourcePath: "../sdk-python/neopilot/sdk.py",
    destinationPath: "docs/content/docs/reference/sdk/python/RemoteEndpoints.mdx",
    title: "Remote Endpoints",
    description:
      "NeoPilot Remote Endpoints allow you to connect actions and agents written in Python to your NeoPilot application.",
    pythonSymbols: ["NeoPilotRemoteEndpoint", "NeoPilotContext"],
  },
  {
    sourcePath: "packages/sdk-js/src/langgraph.ts",
    destinationPath: "docs/content/docs/reference/sdk/js/LangGraph.mdx",
    title: "LangGraph SDK",
    description:
      "The NeoPilot LangGraph SDK for JavaScript allows you to build and run LangGraph workflows with NeoPilot.",
    typescriptSymbols: [
      "neopilotCustomizeConfig",
      "neopilotExit",
      "neopilotEmitState",
      "neopilotEmitMessage",
      "neopilotEmitToolCall",
    ],
  },
];
