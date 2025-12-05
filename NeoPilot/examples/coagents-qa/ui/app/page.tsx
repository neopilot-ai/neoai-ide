"use client";

import { NeoPilot } from "@neopilot/react-core";
import { Mailer } from "./Mailer";
import "@neopilot/react-ui/styles.css";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between">
      <NeoPilot runtimeUrl="/api/neopilot" agent="email_agent">
        <Mailer />
      </NeoPilot>
    </main>
  );
}
