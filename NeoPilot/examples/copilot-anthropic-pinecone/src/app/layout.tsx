
import "./globals.css";

import { MantineProvider } from "@mantine/core";

import "@mantine/core/styles.css";
import "@neopilot/react-ui/styles.css";

import { NeoPilot } from "@neopilot/react-core";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NeoPilot runtimeUrl="/api/neopilot">
          <MantineProvider>{children}</MantineProvider>
        </NeoPilot>
      </body>
    </html>
  );
}
