import type { Metadata } from "next";

import { NeoPilot } from "@neopilot/react-core";

import "@neopilot/react-ui/styles.css";

export const metadata: Metadata = {
  title: "CoAgents Starter",
  description: "CoAgents Starter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <NeoPilot
      agent={process.env.NEXT_PUBLIC_NEOPILOT_AGENT_NAME}
      runtimeUrl={process.env.NEXT_PUBLIC_NEOPILOT_RUNTIME_URL}
      publicApiKey={process.env.NEXT_PUBLIC_COPILOT_API_KEY}
    >
      {children}
    </NeoPilot>
  );
}