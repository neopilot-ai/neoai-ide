"use client";
import { useCopilotAction } from "@neopilot/react-core";
import { CopilotPopup } from "@neopilot/react-ui";
import { useState } from "react";

export default function YourApp() {
  return (
    <>
      <CopilotPopup
        instructions={
          "You are assisting the user as best as you can. Answer in the best way possible given the data you have."
        }
        defaultOpen={true}
        labels={{
          title: "Popup Assistant",
          initial: "Need any help?",
        }}
      />
    </>
  );
}
