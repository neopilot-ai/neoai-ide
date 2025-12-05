"use client";
import { NeoPilot, useCopilotAction, useCopilotReadable } from "@neopilot/react-core";
import { CopilotTextarea } from "@neopilot/react-textarea";
import { CopilotSidebar } from "@neopilot/react-ui";
import "@neopilot/react-ui/styles.css";
import { useState } from "react";
import "@neopilot/react-textarea/styles.css";
import "@neopilot/react-ui/styles.css";
function InsideHome() {
  const [message, setMessage] = useState("Hello World!");
  const [text, setText] = useState("");
  useCopilotReadable({
    description: "This is the current message",
    value: message,
  });
  useCopilotAction(
    {
      name: "displayMessage",
      description: "Display a message.",
      parameters: [
        {
          name: "message",
          type: "string",
          description: "The message to display.",
          required: true,
        },
      ],
      handler: async ({ message }) => {
        setMessage(message);
      },
      render: (props) => {
        return (
          <div style={{ backgroundColor: "black", color: "white" }}>
            <div>Status: {props.status}</div>
            <div>Message: {props.args.message}</div>
          </div>
        );
      },
    },
    [],
  );
  return (
    <>
      <div>{message}</div>
      {/* <CopilotTextarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        autosuggestionsConfig={{
          textareaPurpose: "an outline of a presentation about elephants",
          chatApiConfigs: {},
        }}
      /> */}
    </>
  );
}
export default function Home() {
  return (
    <NeoPilot url="/api/neopilot/langchain">
      <CopilotSidebar
        defaultOpen={true}
        labels={{
          title: "Presentation Copilot",
          initial: "Hi you! 👋 I can give you a presentation on any topic.",
        }}
      >
        <InsideHome />
      </CopilotSidebar>
    </NeoPilot>
  );
}
