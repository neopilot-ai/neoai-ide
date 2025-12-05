"use client";

import { useModelSelectorContext } from "@/lib/model-selector-provider";
import { useCoAgent } from "@neopilot/react-core";
import { CopilotPopup } from "@neopilot/react-ui";
import { useCopilotChatSuggestions } from "@neopilot/react-ui";
export function Greeter() {
  const { model } = useModelSelectorContext();

  useCopilotChatSuggestions({
    instructions: "Greet me!",
  });

  useCoAgent({
    name: "greeting_agent",
    initialState: {
      model,
    },
  });

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="text-2xl">Text Q&A example</div>
      <div>
        ask: {'"'}Greet me!{'"'}
      </div>

      <CopilotPopup defaultOpen={true} clickOutsideToClose={false} />
    </div>
  );
}
