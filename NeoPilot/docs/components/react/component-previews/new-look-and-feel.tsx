"use client"

import { CopilotSidebar, useCopilotChatSuggestions } from "@neopilot/react-ui";
import { NeoPilot } from "@neopilot/react-core";


export const NewLookAndFeelPreview = () => {
  return (
    <NeoPilot publicApiKey={process.env.NEXT_PUBLIC_COPILOT_CLOUD_PUBLIC_API_KEY}>
      <Chat />
    </NeoPilot>
  )
}

const Chat = () => {
  useCopilotChatSuggestions({
    instructions: "Give suggestions for a fun conversation to have with the user.",
    minSuggestions: 0,
    maxSuggestions: 3,
  })

  return (
    <CopilotSidebar
      onThumbsUp={(message) => alert(message)} 
      onThumbsDown={(message) => alert(message)}
      labels={{
        initial: "Hey there Let's have a fun conversation!"
      }}
    />
  )
}
