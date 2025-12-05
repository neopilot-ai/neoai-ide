import { useCopilotAction } from "@neopilot/react-core";

useCopilotAction({
  name: "noargs",
  handler: async () => {
    console.log("No args action");
  },
});
