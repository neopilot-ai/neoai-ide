import { CopilotRuntime, OpenAIAdapter } from "@neopilot/runtime";
import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const neoPilot = new CopilotRuntime();
  return neoPilot.response(request, new OpenAIAdapter({}));
}
