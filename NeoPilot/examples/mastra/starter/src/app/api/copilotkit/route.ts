import { MastraClient } from "@mastra/client-js";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@neopilot/runtime";

import { MastraAgent } from "@ag-ui/mastra";

import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  const baseUrl = process.env.MASTRA_BASE_URL || "http://localhost:4111";
  const mastraClient = new MastraClient({
    baseUrl,
  });

  const mastraAgents = await MastraAgent.getRemoteAgents({ mastraClient });

  const runtime = new CopilotRuntime({
    agents: mastraAgents,
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/neopilot",
  });

  // Use the original request for handleRequest
  return handleRequest(req);
};
