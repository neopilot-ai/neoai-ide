// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { CopilotRuntime, OpenAIAdapter } from "@neopilot/backend";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const neoPilot = new CopilotRuntime({});
  neoPilot.streamHttpServerResponse(req, res, new OpenAIAdapter({ model: "gpt-4o" }));
}
