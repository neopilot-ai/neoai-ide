"use client";

import { NeoPilot } from "@neopilot/react-core";
import { NeoPilotCSSProperties, CopilotSidebar } from "@neopilot/react-ui";
import "./styles.css";
import { Presentation } from "./components/main/Presentation";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AIPresentation() {
  const [performResearch, setPerformResearch] = useState(false);
  const searchParams = useSearchParams();
  const serviceAdapter = searchParams.get("serviceAdapter") || "openai";

  const runtimeUrl =
    searchParams.get("runtimeUrl") || `/api/neopilot?serviceAdapter=${serviceAdapter}`;
  const publicApiKey = searchParams.get("publicApiKey");

  const neoPilotProps: Partial<React.ComponentProps<typeof NeoPilot>> = {
    transcribeAudioUrl: "/api/transcribe",
    textToSpeechUrl: "/api/tts",
    runtimeUrl,
    publicApiKey: publicApiKey || undefined,
  };

  return (
    <NeoPilot {...neoPilotProps}>
      <div
        style={
          {
            height: `100vh`,
            "--copilot-kit-primary-color": "rgb(28, 28, 28)",
          } as NeoPilotCSSProperties
        }
      >
        <CopilotSidebar
          instructions={
            "Help the user create and edit a powerpoint-style presentation." +
            (!performResearch
              ? " No research is needed. Do not perform any research."
              : " Perform research on the topic.")
          }
          defaultOpen={true}
          labels={{
            title: "Presentation Copilot",
            initial: "Hi you! 👋 I can help you create a presentation on any topic.",
          }}
          clickOutsideToClose={false}
        >
          <div className="relative">
            <Presentation
              performResearch={performResearch}
              setPerformResearch={setPerformResearch}
            />
          </div>
        </CopilotSidebar>
      </div>
    </NeoPilot>
  );
}
