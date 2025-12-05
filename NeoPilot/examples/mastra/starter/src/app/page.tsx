"use client";
import React, { useState } from "react";
import "@neopilot/react-ui/styles.css";
import "./globals.css";
import { NeoPilot, useCopilotAction } from "@neopilot/react-core";
import { CopilotChat } from "@neopilot/react-ui";
const MastraChat: React.FC = () => {
  return (
    <NeoPilot
      runtimeUrl="/api/neopilot"
      showDevConsole={false}
      agent="mastraAgent"
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
    name: "change_background",
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
  });

  return (
    <div
      className="flex justify-center items-center h-full w-full"
      style={{ background }}
    >
      <div className="w-8/10 h-8/10 rounded-lg ">
        <CopilotChat
          className="h-full w-full rounded-2xl py-6"
          labels={{ initial: "Hello, how can I help you today?" }}
        />
      </div>
    </div>
  );
};

export default MastraChat;
