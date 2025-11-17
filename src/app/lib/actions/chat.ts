"use server";

import { getServerSession } from "next-auth/next";
import { chatAnthropic } from "../anthropic";
import { Issue } from "./common/entities/issue";
import { Epic } from "./common/entities/epic";
import { trackAction } from "../telemetry";
import { MergeRequest } from "./common/entities/merge_request";
import { InsightsBlob } from "./common/entities/blob";
import { Learn } from "./learn/learn";

export interface ChatMessage {
    sender: string,
    content: string,
    timestamp: string,
}

export async function* sendChatMessage(messages: ChatMessage[], mrDetails?: MergeRequest | null, issue?: Issue | null, epic?: Epic | null, runbookQuery?: boolean | null, blob?: InsightsBlob | null, learn?: Learn): AsyncGenerator<string, void, unknown> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('No session found. Please log in.');
  }

  trackAction(session?.user?.name, "chat_message")
    .catch(e => console.error('Could not track action:', e))

  if (mrDetails) {
    messages = [{
      sender: 'System',
      content: `
        You are a helpful assistant and an expert software engineer
        You are reviewing the merge request ${mrDetails.title}. 
        The description is ${mrDetails.description}. 
        The code changes are ${mrDetails.codeChanges.map(change => change.diff).join('\n')}. 
        The discussions are ${mrDetails.discussions.map(discussion => discussion.message).join('\n')}.

        You have already shown the user the following information

        ----------
        Summary:
        ${mrDetails.summary.summary}

        ----------
        Key Changes:
        ${mrDetails.summary.keyChanges}

        ----------
        Analysis:
        ${mrDetails.analysis?.reviewApproach}
        ${mrDetails.analysis?.breakdown}
        ${mrDetails.analysis?.testingStrategy}
        ${mrDetails.analysis?.suggestedQuestions}
        ${mrDetails.analysis?.architecturalComponents}

        ----------
        Discussion Analysis:
        ${mrDetails.discussionsAnalysis.summary}

        ----------
        Open Actions:
        ${mrDetails.discussionsAnalysis.actions.map(action => `
          Action: ${action.action}
          Owner: ${action.owner}
          URL: ${action.web_url}
        `).join('\n')}

        Security Review:
        ---------------
        ${mrDetails.securityReview}

        You need to respond to the user as if you are a senior software engineer.
        Be as specific as possible, and try to include examples and code snippets where relevant.
        Be as friendly and professional as possible.
        Be as concise as possible.
        If you don't know the answer, just say "I don't know" and don't make up an answer.
      `,
      timestamp: new Date().toISOString(),
    }, ...messages];
  } else if (issue) {
    messages = [{
      sender: 'System',
      content: `
        You are a helpful assistant and an expert software engineer
        You are reviewing the issue ${issue.title}. 
        The description is ${issue.description}. 
        The discussions are ${issue.discussions.map(discussion => discussion.body).join('\n')}.

        ----------
        Understanding:
        ${issue.analysis.understanding.mainProblem}
        ${issue.analysis.understanding.requirements}
        ${issue.analysis.understanding.useCase}
        ${issue.analysis.understanding.unfamiliarTerms}
        ${issue.analysis.understanding.keyTerms}
        ----------
        Discussion Summary:
        ${issue.analysis.comments.insights}
        ${issue.analysis.comments.concerns}

        ----------
        You need to respond to the user as if you are a senior software engineer.
        Be as specific as possible, and try to include examples and code snippets where relevant.
        Be as friendly and professional as possible.
        Be as concise as possible.
        If you don't know the answer, just say "I don't know" and don't make up an answer.
      `,
      timestamp: new Date().toISOString(),
    }, ...messages];
  } else if (epic) {
    messages = [{
      sender: 'System',
      content: `
        You are a helpful assistant and an expert software engineer
        You are helping the user understand the epic ${epic.title}. 
        The description is ${epic.description}. 
        The issues are ${epic.issues.map(issue => issue.title).join('\n')}.
        The child epics are ${epic.childEpics.map(epic => epic.title).join('\n')}. 
        The discussions are ${epic.discussions.map(discussion => discussion.message).join('\n')}.
      `,
      timestamp: new Date().toISOString(),
    }, ...messages];
  } else if (runbookQuery) {
  } else if (blob) {
    messages = [{
      sender: 'System',
      content: `
       You are a helpful assistant and an expert software engineer
        You are helping the user understand the following file ${blob.path}. 

        The contents are: 
        ${blob.contents}
      `,
      timestamp: new Date().toISOString(),
    }, ...messages]
  } else if (learn) {
    console.log('learn', learn);
    messages = [{
      sender: 'System',
      content: `
       You are a helpful assistant and an expert software engineer
       The user is trying to understand the following topic ${learn.topic}.

       You have already created the following for the user

       Explanation
       -----
       ${learn.explanation}
       -----

       Code Examples
       -----------
       ${learn.codeExamples}
       -----------

       Assignments
       ------------
       ${learn.assignments}
       ------------

       Flashcards
       -----------
       ${learn.flashCards}
       -----------
       
       Quiz
       -------
       ${learn.quiz?.map(question => `
         Question ${question.question}
         Options:
         ${question.options.map((option, index) => `  ${String.fromCharCode(65 + index)}. ${option}`)}
         Correct Answer: ${question.correctAnswer}
         Explanation: ${question.explanation}
       `).join('\n')}
       -------
       
       Related Topics
       -----------------
       ${learn.relatedTopics}
       -----------------

       Could you please help them learn the topic?
      `,
      timestamp: new Date().toISOString(),
    }, ...messages]
  } else {
    throw new Error('No MR, issue, epic, blob or runbook query provided');
  }

  const stream = chatAnthropic(
    'claude-sonnet-4-0',
    messages.map((message) => ({
      role: message.sender === 'Human' || message.sender === 'System' ? 'user' : 'assistant',
      content: message.content,
    }))
  );

  
  for await (const chunk of stream) {
    yield chunk;
  }
}