"use client";

import { NeoPilot } from "@neopilot/react-core";
import { Translator } from "./Translator";
import "@neopilot/react-ui/styles.css";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between">
      <NeoPilot runtimeUrl="/api/neopilot" agent="translate_agent">
        <Translator />
      </NeoPilot>
    </main>
  );
}
