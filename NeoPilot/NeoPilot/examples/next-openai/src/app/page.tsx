"use client";

import { NeoPilot } from "@neopilot/react-core";
import { CopilotSidebar } from "@neopilot/react-ui";
import { VacationList } from "./components/vacation-list";
import { useSearchParams } from "next/navigation";

export default function WaterBnb() {
  const searchParams = useSearchParams();
  const serviceAdapter = searchParams.get("serviceAdapter") || "openai";

  const runtimeUrl =
    searchParams.get("runtimeUrl") || `/api/neopilot?serviceAdapter=${serviceAdapter}`;
  const publicApiKey = searchParams.get("publicApiKey");
  const neoPilotProps: Partial<React.ComponentProps<typeof NeoPilot>> = {
    runtimeUrl,
    publicApiKey: publicApiKey || undefined,
    showDevConsole: true,
  };

  return (
    <NeoPilot {...neoPilotProps}>
      <CopilotSidebar
        onThumbsUp={(message) => {
          console.log("thumbs up", message);
        }}
        onThumbsDown={(message) => {
          console.log("thumbs down", message);
        }}
        imageUploadsEnabled={true}
      >
        <VacationList />
      </CopilotSidebar>
    </NeoPilot>
  );
}
