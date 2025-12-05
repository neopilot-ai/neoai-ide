import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@neopilot/runtime";
import { HttpAgent } from "@ag-ui/client";
import { agentsIntegrations } from "@/agents";

import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
 
  const runtime = new CopilotRuntime({
    agents: {
      sample_agent: new HttpAgent({
        url: "http://127.0.0.1:9000/run",
      })
    }
  })

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: `/api/neopilot`,
  });

  return handleRequest(request);
}
