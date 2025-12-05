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
          agent="sample_agent"
          runtimeUrl="/api/neopilot"
          showDevConsole={false}
        >
          {children}
        </NeoPilot>
      </body>
    </html>
  );
}
