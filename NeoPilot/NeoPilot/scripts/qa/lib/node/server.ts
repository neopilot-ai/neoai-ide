/**
 * @filePath server.ts
 */
import { createServer } from "node:http";
import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNodeHttpEndpoint } from "@neopilot/runtime";
import OpenAI from "openai";

const openai = new OpenAI();
const serviceAdapter = new OpenAIAdapter({ openai });

const runtime = new CopilotRuntime();

const copilotRuntime = copilotRuntimeNodeHttpEndpoint({
  endpoint: "/neopilot",
  runtime,
  serviceAdapter,
});

const server = createServer((req, res) => {
  return copilotRuntime(req, res);
});

server.listen(4000, () => {
  console.log("Listening at http://localhost:4000/neopilot");
});
