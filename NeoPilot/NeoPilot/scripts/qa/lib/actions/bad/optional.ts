import { useCopilotAction } from "@neopilot/react-core";

useCopilotAction({
  name: "optional",
  parameters: [
    {
      name: "arg",
      type: "string",
      description: "The optional argument to display.",
      required: false,
    },
  ],
  handler: async ({ arg }) => {
    // TODO this should fail
    let x: string = arg;
  },
});
