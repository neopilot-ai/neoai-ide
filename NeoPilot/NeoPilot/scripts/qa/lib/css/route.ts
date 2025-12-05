import { CopilotRuntime, OpenAIAdapter } from "@neopilot/runtime";

export async function POST(req: Request): Promise<Response> {
  const neoPilot = new CopilotRuntime();
  return neoPilot.response(req, new OpenAIAdapter({}));
}
