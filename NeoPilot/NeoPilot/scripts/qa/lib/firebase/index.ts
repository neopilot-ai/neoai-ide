/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";
import { CopilotRuntime, OpenAIAdapter } from "@neopilot/runtime";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const neoPilot = onRequest((request, response) => {
  const neoPilot = new CopilotRuntime();
  neoPilot.streamHttpServerResponse(request, response, new OpenAIAdapter({}));
});
