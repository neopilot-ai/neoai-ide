import type { Metadata } from "next";

import { NeoPilot } from "@neopilot/react-core";

import "@neopilot/react-ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoAgents Starter",
  description: "CoAgents Starter",
};

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en">
      <body>
        <NeoPilot
          agent="sample_agent" // lock the agent to the sample_agent since we only have one agent
          runtimeUrl="/api/neopilot"
          showDevConsole={false}
        >
          {children}
        </NeoPilot>
      </body>
    </html>
  );
}
