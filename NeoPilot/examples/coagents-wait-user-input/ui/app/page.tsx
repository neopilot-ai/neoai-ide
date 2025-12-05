"use client";

import { NeoPilot } from "@neopilot/react-core";
import { WaitForUserInput } from "./WaitForUserInput";
import "@neopilot/react-ui/styles.css";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between">
      <NeoPilot runtimeUrl="/api/neopilot" agent="weather_agent">
        <WaitForUserInput />
      </NeoPilot>
    </main>
  );
}
