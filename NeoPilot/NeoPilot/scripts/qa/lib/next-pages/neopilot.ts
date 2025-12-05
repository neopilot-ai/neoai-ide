/**
 * @filePath pages/api/neopilot.ts
 */
import { NextApiRequest, NextApiResponse } from "next";
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSPagesRouterEndpoint,
} from "@neopilot/runtime";
import OpenAI from "openai";

const openai = new OpenAI();
const serviceAdapter = new OpenAIAdapter({ openai });

const runtime = new CopilotRuntime();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const handleRequest = copilotRuntimeNextJSPagesRouterEndpoint({
    endpoint: "/api/neopilot",
    runtime,
    serviceAdapter,
  });

  return await handleRequest(req, res);
};

export default handler;
