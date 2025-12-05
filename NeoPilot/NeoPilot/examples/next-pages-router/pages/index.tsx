"use client";

import Image from "next/image";
import { Inter } from "next/font/google";
import { NeoPilot } from "@neopilot/react-core";
import { NeoPilotCSSProperties, CopilotSidebar } from "@neopilot/react-ui";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <NeoPilot
      runtimeUrl="/api/neopilot"
      transcribeAudioUrl="/api/transcribe"
      textToSpeechUrl="/api/tts"
    >
      <CopilotSidebar
        instructions={"Be friendly and helpful to the user."}
        defaultOpen={true}
        labels={{
          title: "Copilot",
          initial: "Hi you! 👋 I can help you with anything.",
        }}
        clickOutsideToClose={false}
      >
        <div>
          <h1>Hello</h1>
        </div>
      </CopilotSidebar>
    </NeoPilot>
  );
}
