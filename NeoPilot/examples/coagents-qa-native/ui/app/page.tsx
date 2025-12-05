"use client";

import { NeoPilot } from "@neopilot/react-core";
import { Mailer } from "./Mailer";
import "@neopilot/react-ui/styles.css";
import {
  ModelSelectorProvider,
  useModelSelectorContext,
} from "@/lib/model-selector-provider";
import { ModelSelector } from "@/components/ModelSelector";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function ModelSelectorWrapper() {
  return (
    <main className="flex flex-col items-center justify-between">
      <ModelSelectorProvider>
        <Suspense>
          <Home />
        </Suspense>
        <ModelSelector />
      </ModelSelectorProvider>
    </main>
  );
}

function Home() {
  const { lgcDeploymentUrl, agent } = useModelSelectorContext();

  const searchParams = useSearchParams();

  const runtimeUrl = searchParams.get("runtimeUrl")
    ? (searchParams.get("runtimeUrl") as string)
    : `/api/neopilot?lgcDeploymentUrl=${lgcDeploymentUrl ?? ""}`;

  const publicApiKey = searchParams.get("publicApiKey");
  const neoPilotProps: Partial<React.ComponentProps<typeof NeoPilot>> = {
    runtimeUrl,
    publicApiKey: publicApiKey || undefined,
    showDevConsole: false,
    agent,
  };

  return (
    <NeoPilot {...neoPilotProps}>
      <Mailer />
    </NeoPilot>
  );
}
