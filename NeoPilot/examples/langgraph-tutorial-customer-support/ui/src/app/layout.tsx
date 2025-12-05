import { ReactNode } from "react";
import { NeoPilot } from "@neopilot/react-core";
import "@neopilot/react-ui/styles.css";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Make sure to use the URL you configured in the previous step  */}
        <NeoPilot runtimeUrl="/api/neopilot" agent="customer_support_agent">
          {children}
        </NeoPilot>
      </body>
    </html>
  );
}
