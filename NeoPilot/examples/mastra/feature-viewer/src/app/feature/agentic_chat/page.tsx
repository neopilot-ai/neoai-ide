"use client";
import React, { useState } from "react";
import "@neopilot/react-ui/styles.css";
import "./style.css";
import {
  NeoPilot,
  useCopilotAction,
  useCopilotChat,
} from "@neopilot/react-core";
import { CopilotChat } from "@neopilot/react-ui";

const AgenticChat: React.FC = () => {
  return (
    <NeoPilot
      runtimeUrl="/api/neopilot"
      showDevConsole={false}
      // agent lock to the relevant agent
      agent="agenticChatAgent"
    >
      <Chat />
    </NeoPilot>
  );
};

const Chat = () => {
  const [background, setBackground] = useState<string>(
    "--copilot-kit-background-color"
  );

  useCopilotAction({
    name: "changeBackgroundTool",
    description:
      "Change the background color of the chat. Can be anything that the CSS background attribute accepts. Regular colors, linear of radial gradients etc.",
    parameters: [
      {
        name: "background",
        type: "string",
        description: "The background. Prefer gradients.",
      },
    ],
    handler: ({ background }) => {
      setBackground(background);
    },
    followUp: false,
  });

  return (
    <div
      className="flex justify-center items-center h-full w-full"
      style={{ background }}
    >
      <div className="w-8/10 h-8/10 rounded-lg">
        <CopilotChat
          className="h-full rounded-2xl"
          labels={{ initial: "Hi, I'm an agent. Want to chat?" }}
        />
      </div>
    </div>
  );
};

export default AgenticChat;
