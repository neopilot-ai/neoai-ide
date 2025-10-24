"use server";

import Anthropic from "@anthropic-ai/sdk";
import { chatAnthropic } from "../../anthropic";
import { ComposerChatMessage } from "./chat_message";
import { createTwoFilesPatch } from 'diff';
import { Issue } from "../common/entities/issue";
import { MergeRequest } from "../common/entities/merge_request";
import { Epic } from "../common/entities/epic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { trackRun } from "../../telemetry";

export type ArtifactType =
  | 'issue'
  | 'mr'
  | 'epic'
  | 'email'
  | 'slack';

export type WritingSettings = {
  tone?: string;
};

export type Entity = MergeRequest | Issue | Epic | WritingSettings;

const artifactPromptMap: Record<ArtifactType, (entity?: Entity) => string> = {
  issue: (entity?: Entity) => `You are creating an issue description. Please be concise and specific. Your aim is to provide the user with all the information they need to create an issue. Do not add additional commentary.
  Generate markdown to be sent to the Issue create screen. Use the following guidelines:
  
  1. Add as much detail as possible to the issue description based on what the user asks
  2. Use inclusive language
  3. Include both the need and the ideal solution
  4. Use active voice
  5. Be specific about what the user needs
  6. Keep it short, avoid repeating words
  7. Include a table of key points and actions to take

  Here are the issue details:
  Title: ${(entity as Issue)?.title || 'Unknown'}
  Discussions:
  ${(entity as Issue)?.discussions?.map((discussion) => `Author: ${discussion.author}\n Body: ${discussion.body}`).join('\n--------\n')}
  `,
  mr: (entity?: Entity) => `You are creating a merge request description. Please be concise and specific. Your aim is to provide the user with all the information they need to create a merge request. Do not add additional commentary.
  Generate markdown to be sent to the Merge Request create screen. Use the following guidelines:
  
  1. Add as much detail as possible to the merge request description based on what the user asks
  2. Use inclusive language
  3. Include the need for the changes
  4. Include the problem being solved
  5. Use active voice
  6. Be specific about the changes being made
  7. Keep it short, avoid repeating words
  8. Include a table of key points and actions to take
  9. Do not include code in the description, only a link to the diff
  
  Here are the merge request details:
  Title: ${(entity as MergeRequest)?.title || 'Your Title'}
  Diff: ${(entity as MergeRequest)?.codeChanges.map((change) => `New Path: ${change.new_path}\nOld Path: ${change.old_path}\nDiff: ${change.diff}\n`).join('------\n')}
  `,
  slack: (entity?: Entity) => `You are creating a Slack message. 
    The user wants the following tone ${(entity as WritingSettings)?.tone}
  `,
  email: (entity?: Entity) => `You are creating an email. 
    The user wants the following tone ${(entity as WritingSettings)?.tone}
  `,
  epic: (entity?: Entity) => `
    You are creating an Epic description. Please be specific. 
    Generate markdown. Use the following guidelines:
    
    1. Add as much detail as possible to the epic description based on what the user asks
    2. Use inclusive language
    3. Include the need for the new epic
    4. Explain the business context of the new epic
    5. Include key points of the epic
    6. Explain the impact of the new epic
    7. Include all the major workstreams
    8. Include your role in the epic
    9. Be specific about the role of each workstream
    10. Describe the key stakeholders of the epic and their role

    The epic details are as follows:
    Title: ${(entity as Epic)?.title || 'Your Title'}
    Discussions:
    ${(entity as Epic)?.discussions?.map((discussion) => `Author: ${discussion.author}\n Body: ${discussion.message}`).join('\n--------\n')}

    Child Epics:
    ${(entity as Epic).childEpics?.map((issue) => `Title: ${issue.title}\nDescription: ${issue.description}`).join('\n--------\n')}

    Child Issues:
    ${(entity as Epic)?.issues?.map((issue) => `Title: ${issue.title}\nDescription: ${issue.description}`).join('\n--------\n')}
  `
};

const BASE_SYSTEM_PROMPT = `
You are a helpful assistant. For the request made to you, please provide your
response in the following format, where you are providing the contents of the artifact
you are generating and your thought process in distinctly demarcated tags. Please ensure that
you do not provide any content outside of these tags.

If you are asked to generate a document, please think though the various sections of the document and put in as
much detail as possible. Be thorough and detailed.

If the user makes a change to the artifact during the course of the conversation, you will recieve a diff of the user 
change in the <user_edits> tag. The original issue/MR details will be sent in the <original_text> tag.

If the user has selected specific text in the artifact you will receive the selected text in the <selectedText> tag.
If selected text is provided then you must use the selected text to inform your response, such as explaining the change that was made.

Here is example output:

---
<artifact>
# Markdown of the document

## Section 1
...
</artifact>

<explanation>
Users first need to install the pre-requisites because...
</explanation>
---

Note: Make sure that the entire contents of the artifact are sent in the <artifact> tag. Don't create any placeholders or pass a section of the text. 


If you want to edit the existing artifact, you can just send the text to replace and the text to replace it with. Prefer this over the above for an existing artifact to make small changes (1-15 lines).

Here is an example response for edit:

---
<edit>
  <orignal_text>And even more text to replace</orignal_text>
  <new_text>The text to replace with</new_text>
</edit>
<explanation>
I've updated the testing section....
</explanation>
---

Remember all tags should be closed correctly.
`;

export async function* sendChatMessage(
  artifactType: ArtifactType,
  history: ComposerChatMessage[],
  entity?: Entity,
  selectedText?: string
): AsyncGenerator<UserChatMessageResponse, void, unknown> {

  const session = await getServerSession(authOptions);
  if (!session) {
    return;
  }

  const { user } = session;

  trackRun(user?.name, user?.email, "", 'composer')
    .catch(e => console.error('Could not track run:', e))

  const systemMessage: Anthropic.MessageParam = {
    role: 'user',
    content: `
      You are a helpful assistant. 

      ${BASE_SYSTEM_PROMPT}

      You are generating a ${artifactType}. 
      
      ${artifactPromptMap[artifactType](entity)}
    `
  };

  const formattedMessages: Anthropic.MessageParam[] = history.map((message, index) => {
    if (message.sender === "system" || message.sender === "user") {
      let diff = `<original_text>\n${message.artifact}\n</original_text>`;

      // Only look at previous messages
      const oldAIMessagesWithArtifacts = history
        .slice(0, index)
        .filter((m) => m.sender === "assistant" && m.artifact);

      if (oldAIMessagesWithArtifacts.length > 0) {
        const latestAIMessageWithArtifact =
          oldAIMessagesWithArtifacts[oldAIMessagesWithArtifacts.length - 1];

        diff =
          "<user_edits>" +
          createTwoFilesPatch(
            "original",
            "new",
            latestAIMessageWithArtifact.artifact,
            message.artifact
          ) +
          "</user_edits>";
      }

      return {
        role: "user",
        content: `${diff}\n<message>\n${message.content}\n</message>${
          selectedText ? `<selectedText>${selectedText}</selectedText>` : ""
        }`,
      };
    } else {
      // Assistant messages
      const artifactContent = message.artifact || "";
      const explanationContent = message.content || "";
      return {
        role: "assistant",
        content: `<artifact>\n${artifactContent}\n</artifact>\n<explanation>\n${explanationContent}\n</explanation>`,
      };
    }
  });

  const messages = [systemMessage, ...formattedMessages];

  const responseData: UserChatMessageResponse = {
    message: "",
    artifact: "",
  };

  // We'll collect the entire response for a final parse,
  // while still doing a chunk-by-chunk parse for edits.
  let completeResponse = "";

  // We keep a small buffer for partial chunk processing
  let collectedChunks = "";

  // We track whether we're currently in <artifact>...</artifact> or <explanation>...</explanation>
  let inArtifact = false;
  let inExplanation = false;

  // Pre-populate the artifact with the last known artifact (if any),
  // so real-time edits can be applied. We only do this if there's no artifact yet.
  if (!responseData.artifact) {
    const oldAIMessagesWithArtifacts = history
      .filter((m) => m.sender === "assistant" && m.artifact);

    if (oldAIMessagesWithArtifacts.length > 0) {
      const latestAIMessageWithArtifact =
        oldAIMessagesWithArtifacts[oldAIMessagesWithArtifacts.length - 1];
      responseData.artifact = latestAIMessageWithArtifact.artifact || "";
    }
  }

  const stream = chatAnthropic("claude-sonnet-4-0", messages, 8192);

  for await (const chunk of stream) {
    completeResponse += chunk;
    collectedChunks += chunk;

    // Process any <edit> blocks we find in collectedChunks.
    // We'll parse them out and apply them as they appear, so the user sees incremental updates.
    let editCloseIndex: number;
    while ((editCloseIndex = collectedChunks.indexOf("</edit>")) !== -1) {
      // everything up to </edit>
      const editBlockWithClose = collectedChunks.slice(0, editCloseIndex + 7);
      collectedChunks = collectedChunks.slice(editCloseIndex + 7);
      // console.log('streaming - In edit close');

      // parse out one or more <edit> blocks from the chunk
      // there could be multiple <edit> blocks back to back
      const editBlocks = [...editBlockWithClose.matchAll(/<edit>([\s\S]*?)<\/edit>/g)];
      // console.log('streaming - edit blocks', editBlocks);
      for (const blockMatch of editBlocks) {
        const editContent = blockMatch[1];
        const textToReplaceMatches = [
          ...editContent.matchAll(/<orignal_text>([\s\S]*?)<\/orignal_text>/g),
        ].map((m) => m[1]);
        const replacedTextMatches = [
          ...editContent.matchAll(/<new_text>([\s\S]*?)<\/new_text>/g),
        ].map((m) => m[1]);
        console.log('streaming - edit textToReplaceMatches', textToReplaceMatches);
        console.log('streaming - edit replacedTextMatches', replacedTextMatches);

        // Apply them in order
        for (let i = 0; i < textToReplaceMatches.length; i++) {
          const toReplace = textToReplaceMatches[i];
          const replaceWith = replacedTextMatches[i];
          if (responseData.artifact) {
            console.log('Actual replacing');
            responseData.artifact = responseData.artifact.split(toReplace).join(replaceWith);
          }
        }
      }

      // After applying edits, yield the updated artifact to let the caller see changes
      yield { ...responseData };
    }

    // Now handle <artifact> and </artifact>
    if (collectedChunks.includes("<artifact>")) {
      inArtifact = true;
      responseData.artifact = '';
      // remove the tag from the buffer
      collectedChunks = collectedChunks.replace("<artifact>", "");
    }

    if (inArtifact && collectedChunks.includes("</artifact>")) {
      // We'll capture everything in between
      const [beforeClose, ...rest] = collectedChunks.split("</artifact>");
      responseData.artifact += beforeClose;
      inArtifact = false;
      collectedChunks = rest.join("</artifact>");
      // yield updated artifact
      yield { ...responseData };
    } else if (inArtifact) {
      // Add everything we have to the artifact so far
      responseData.artifact += collectedChunks;
      collectedChunks = "";
      yield { ...responseData };
    }

    // Next, handle <explanation> ... </explanation>
    if (collectedChunks.includes("<explanation>")) {
      inExplanation = true;
      collectedChunks = collectedChunks.replace("<explanation>", "");
    }

    if (inExplanation && collectedChunks.includes("</explanation>")) {
      const [beforeClose, ...rest] = collectedChunks.split("</explanation>");
      responseData.message += beforeClose;
      inExplanation = false;
      collectedChunks = rest.join("</explanation>");
      yield { ...responseData };
    } else if (inExplanation) {
      responseData.message += collectedChunks;
      collectedChunks = "";
      yield { ...responseData };
    }
  }

  console.log("Complete response: ", completeResponse)

  //
  // FINAL PASS: In case we missed partial blocks or never caught them in real time.
  //
  // 1. Re-apply <artifact> from the last <artifact> tag if needed.
  //    If the user or model gave multiple <artifact> tags, use the last encountered.
  //
  const artifactMatches = [...completeResponse.matchAll(/<artifact>([\s\S]*?)<\/artifact>/g)];
  if (artifactMatches.length > 0) {
    responseData.artifact = artifactMatches[artifactMatches.length - 1][1];
  }

  // 2. Re-apply <explanation> from the last <explanation> tag if needed.
  const explanationMatches = [...completeResponse.matchAll(/<explanation>([\s\S]*?)<\/explanation>/g)];
  if (explanationMatches.length > 0) {
    responseData.message = explanationMatches[explanationMatches.length - 1][1];
  }

  // 3. Re-apply <edit> blocks in order, in case we missed any partial ones.
  const editMatches = [...completeResponse.matchAll(/<edit>([\s\S]*?)<\/edit>/g)];
  if (editMatches.length > 0) {
    
    const oldMessagesWithArtifacts = history
      .filter((m) => m.artifact);
    if (oldMessagesWithArtifacts.length > 0) {
      const latestAIMessageWithArtifact =
      oldMessagesWithArtifacts[oldMessagesWithArtifacts.length - 1];
      responseData.artifact = latestAIMessageWithArtifact.artifact || "";
    }

    for (const match of editMatches) {
      // console.log('Post streaming - edit matches loop', match);
      const editContent = match[1];
      const textToReplaceMatches = [
        ...editContent.matchAll(/<orignal_text>([\s\S]*?)<\/orignal_text>/gs),
      ].map((m) => m[1]);
      const replacedTextMatches = [
        ...editContent.matchAll(/<new_text>([\s\S]*?)<\/new_text>/gs),
      ].map((m) => m[1]);

      // console.log('Post streaming - edit matches textToReplaceMatches', textToReplaceMatches);
      // console.log('Post streaming - edit matches replacedTextMatches', replacedTextMatches);

      // Apply them in order
      for (let i = 0; i < textToReplaceMatches.length; i++) {
        const toReplace = textToReplaceMatches[i];
        const replaceWith = replacedTextMatches[i];
        if (responseData.artifact) {
          responseData.artifact = responseData.artifact.split(toReplace).join(replaceWith);
        }
      }
    }
  }

  // Final yield with everything updated
  yield responseData;
}

export interface UserChatMessageResponse {
  message: string;
  artifact?: string;
}
