'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Copy, RefreshCw, Check, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { sendChatMessage } from '@/app/lib/actions/chat';
import { getLiveDocsQuery } from '@/app/lib/actions/live_docs_query';
import { useToast } from '@/hooks/use-toast';
import Markdown from '../ui/markdown';
import ChatHistorySidebar from '../ui/chat-history-sidebar';
import { ChatHistoryItem, ChatHistoryStorage } from '../lib/chat-history-storage';

interface EnhancedChatMessage {
  sender: 'Human' | 'AI' | 'System';
  content: string;
  timestamp: string;
  contexts?: Array<{ content: string; sourceLink: string; }>;
  accumulatedContexts?: Array<{ content: string; sourceLink: string; }>;
}

export default function EnhancedDocsChat() {
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentContexts, setCurrentContexts] = useState<Array<{ content: string; sourceLink: string; }>>([]);
  const [isMultiline, setIsMultiline] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [refreshingContext, setRefreshingContext] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [chatTitle, setChatTitle] = useState<string>('');
  const [historyUpdateTrigger, setHistoryUpdateTrigger] = useState(0);
  const [storage] = useState(() => new ChatHistoryStorage('docs'));

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const saveChatToHistory = useCallback(() => {
    if (!currentChatId || messages.length === 0) return;

    const chatHistoryItem: ChatHistoryItem = {
      id: currentChatId,
      title: chatTitle,
      timestamp: new Date().toISOString(),
      messages: messages.filter(msg => msg.sender !== 'System').map(msg => ({
        ...msg,
        accumulatedContexts: msg.sender === 'Human' ? currentContexts : undefined
      })),
      contextCount: currentContexts.length,
      type: 'docs'
    };

    storage.save(chatHistoryItem);
    setHistoryUpdateTrigger(prev => prev + 1);
  }, [currentChatId, messages, chatTitle, currentContexts, storage]);

  // Auto-save chat history
  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        saveChatToHistory();
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages, currentChatId, chatTitle, saveChatToHistory]);

  const startNewChat = () => {
    setMessages([]);
    setCurrentContexts([]);
    setCurrentChatId('');
    setChatTitle('');
    setNewMessage('');
  };

  const loadChatFromHistory = (chat: ChatHistoryItem) => {
    const loadedMessages = chat.messages as EnhancedChatMessage[];
    setMessages(loadedMessages);
    setCurrentChatId(chat.id);
    setChatTitle(chat.title);
    
    // Find the last message with accumulated contexts to restore full context state
    const lastMessageWithAccumulatedContexts = [...loadedMessages]
      .reverse()
      .find(msg => msg.accumulatedContexts && msg.accumulatedContexts.length > 0);
    
    if (lastMessageWithAccumulatedContexts?.accumulatedContexts) {
      setCurrentContexts(lastMessageWithAccumulatedContexts.accumulatedContexts);
    } else {
      // Fallback: collect all contexts from all messages
      const allContexts = loadedMessages
        .filter(msg => msg.contexts)
        .flatMap(msg => msg.contexts || []);
      
      // Deduplicate by sourceLink
      const uniqueContexts = allContexts.filter((context, index, self) => 
        self.findIndex(c => c.sourceLink === context.sourceLink) === index
      );
      
      setCurrentContexts(uniqueContexts);
    }
  };

  const handleChatDeleted = (deletedChatId: string) => {
    if (currentChatId === deletedChatId) {
      startNewChat();
    }
  };

  const copyToClipboard = async (content: string, messageIndex: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageIndex(messageIndex);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Message content has been copied to your clipboard.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy content to clipboard.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const refreshContext = async (messageIndex: number) => {
    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.sender !== 'Human') return;

    setRefreshingContext(true);
    try {
      // Get fresh context from live repositories
      const liveDocsQuery = await getLiveDocsQuery(userMessage.content);
      const freshContexts = liveDocsQuery.contexts;
      
      if (freshContexts.length === 0) {
        toast({
          title: "No fresh context found",
          description: "No new relevant documentation sources found for this query.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      
      // Merge fresh contexts with existing ones for better coverage
      const mergedContexts = mergeContexts(currentContexts, freshContexts);
      
      // Update the contexts for the user message
      const updatedMessages = [...messages];
      updatedMessages[messageIndex - 1] = {
        ...userMessage,
        contexts: freshContexts,
        accumulatedContexts: mergedContexts
      };
      
      setMessages(updatedMessages);
      setCurrentContexts(mergedContexts);
      
      toast({
        title: "Context refreshed",
        description: `Updated with ${freshContexts.length} fresh sources (${mergedContexts.length} total accumulated). Regenerating response...`,
        duration: 3000,
      });

      // Automatically regenerate the AI response with new context
      await regenerateResponse(messageIndex);
      
    } catch (error) {
      console.error('Error refreshing context:', error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh context from live repositories. Check your connection and try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setRefreshingContext(false);
    }
  };

  const regenerateResponse = async (messageIndex: number) => {
    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.sender !== 'Human') return;

    setSubmitting(true);
    const messagesUpToUser = messages.slice(0, messageIndex);
    
    const attemptRegenerate = async (attemptNumber: number = 1): Promise<void> => {
      try {
        /* eslint @typescript-eslint/no-explicit-any: 0 */  // --> OFF
        const stream = await sendChatMessage(messagesUpToUser as any, null, null, null, true);
        
        let aiMessage: EnhancedChatMessage = {
          sender: 'AI',
          content: '',
          timestamp: new Date().toISOString(),
        };

        for await (const chunk of stream) {
          aiMessage = {
            ...aiMessage,
            content: aiMessage.content + chunk,
          };
          setMessages([...messagesUpToUser, aiMessage]);
        }
      } catch (error) {
        console.error(`Error regenerating response (attempt ${attemptNumber}):`, error);
        
        if (isTokenLimitError(error) && attemptNumber < 3) {
          toast({
            title: "Context too large",
            description: `Reducing context and retrying regeneration (attempt ${attemptNumber + 1}/3)...`,
            duration: 3000,
          });
          
          // Reduce current contexts and update the user message
          const reductionFactor = 0.4 + (attemptNumber * 0.1);
          const reducedContexts = reduceContextsForTokenLimit(currentContexts, reductionFactor);
          setCurrentContexts(reducedContexts);
          
          // Update the user message with reduced accumulated contexts
          const updatedMessages = [...messagesUpToUser];
          const userMsgIndex = updatedMessages.length - 1;
          if (updatedMessages[userMsgIndex].sender === 'Human') {
            updatedMessages[userMsgIndex] = {
              ...updatedMessages[userMsgIndex],
              accumulatedContexts: reducedContexts
            };
          }
          
          await attemptRegenerate(attemptNumber + 1);
        } else {
          const errorMessage = isTokenLimitError(error) 
            ? "Context is too large even after reduction. Please start a new conversation."
            : "Failed to regenerate response. Please try again.";
          
          toast({
            title: "Regeneration failed",
            description: errorMessage,
            variant: "destructive",
            duration: 4000,
          });
        }
      }
    };
    
    try {
      await attemptRegenerate();
    } catch (error) {
      console.error('All regeneration attempts failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Check if an error is a token limit error
  const isTokenLimitError = (error: any): boolean => {
    const errorMessage = error?.message || error?.toString() || '';
    return errorMessage.includes('prompt is too long') || 
           errorMessage.includes('tokens >') || 
           errorMessage.includes('maximum');
  };

  // Reduce contexts by removing older/longer ones when token limit is exceeded
  const reduceContextsForTokenLimit = (
    contexts: Array<{ content: string; sourceLink: string; }>,
    targetReduction: number = 0.5 // Remove 50% of contexts by default
  ): Array<{ content: string; sourceLink: string; }> => {
    if (contexts.length === 0) return contexts;
    
    // Sort by content length (longer content first) to remove the most verbose ones
    const sortedByLength = [...contexts].sort((a, b) => b.content.length - a.content.length);
    
    // Calculate how many to keep
    const keepCount = Math.max(1, Math.floor(contexts.length * (1 - targetReduction)));
    
    // Keep the shorter, more concise contexts
    const reducedContexts = sortedByLength.slice(-keepCount);
    
    console.log(`Reduced contexts from ${contexts.length} to ${reducedContexts.length} due to token limit`);
    
    return reducedContexts;
  };

  const mergeContexts = (
    existingContexts: Array<{ content: string; sourceLink: string; }>,
    newContexts: Array<{ content: string; sourceLink: string; }>
  ): Array<{ content: string; sourceLink: string; }> => {
    // Create a Map to track contexts by sourceLink for efficient lookup
    const contextMap = new Map<string, { content: string; sourceLink: string; order: number }>();
    
    // Add existing contexts with their current order
    existingContexts.forEach((context, index) => {
      contextMap.set(context.sourceLink, { ...context, order: index });
    });
    
    // Add/update with new contexts, giving them higher priority (lower order numbers)
    newContexts.forEach((newContext, index) => {
      contextMap.set(newContext.sourceLink, {
        ...newContext,
        content: newContext.content, // Always use fresh content
        order: -1000 + index // Negative numbers to prioritize new contexts
      });
    });
    
    // Convert back to array and sort by order (new contexts first)
    const mergedContexts = Array.from(contextMap.values())
      .sort((a, b) => a.order - b.order)
      .map(({ content, sourceLink }) => ({ content, sourceLink }));
    
    // Limit total contexts with smarter truncation:
    // Keep the most recent (new) contexts and some older ones
    const maxContexts = 40; // Increased from 30 to allow more context
    if (mergedContexts.length > maxContexts) {
      const newContextCount = newContexts.length;
      const keepNew = Math.min(newContextCount, Math.floor(maxContexts * 0.7)); // 70% new contexts
      const keepOld = maxContexts - keepNew;
      
      return [
        ...mergedContexts.slice(0, keepNew), // Keep most new contexts
        ...mergedContexts.slice(newContextCount, newContextCount + keepOld) // Keep some old contexts
      ];
    }
    
    return mergedContexts;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const messageToSend = newMessage;
    
    // Handle reset/clear commands immediately
    if (messageToSend === '/reset' || messageToSend === '/clear') {
      setNewMessage('');
      setIsMultiline(false);
      startNewChat();
      toast({
        title: "Chat cleared",
        description: "Started a new conversation with fresh context.",
        duration: 2000,
      });
      return;
    }

    // Generate chat ID and title for new conversations
    if (!currentChatId) {
      const newChatId = ChatHistoryStorage.generateId();
      const newTitle = ChatHistoryStorage.generateTitle(messageToSend);
      setCurrentChatId(newChatId);
      setChatTitle(newTitle);
    }

    setSubmitting(true);
    setNewMessage('');
    setIsMultiline(false);

    let initialMessages: EnhancedChatMessage[] = [];
    let contexts: Array<{ content: string; sourceLink: string; }> = [];
    let newContexts: Array<{ content: string; sourceLink: string; }> = [];

    // Fetch context: fresh for first message, additional for follow-ups
    try {
      const liveDocsQuery = await getLiveDocsQuery(messageToSend);
      newContexts = liveDocsQuery.contexts;
      
      if (newContexts.length === 0) {
        // If no new contexts found, show warning but continue
        toast({
          title: "No context found",
          description: "No relevant documentation sources found for this query. Response will be based on general knowledge.",
          variant: "destructive",
          duration: 4000,
        });
      }
      
      if (messages.length === 0) {
        // First message: use fresh context
        contexts = newContexts;
      } else {
        // Follow-up message: merge with existing context
        contexts = mergeContexts(currentContexts, newContexts);
      }
      
      setCurrentContexts(contexts);

      let contextString = "";
      for (const context of contexts) {
        contextString += `<context><content>${context.content}</content><sourceLink>${context.sourceLink.replace("/raw/", "/tree/")}</sourceLink></context>`;
      }

      const isFirstMessage = messages.length === 0;
      const contextCount = contexts.length;
      const newContextCount = newContexts.length;
      
      const contextDescription = isFirstMessage 
        ? `Found ${contextCount} relevant documentation sources:`
        : `Added ${newContextCount} new sources (${contextCount} total accumulated):`;
      
      initialMessages = [{
        sender: 'System',
        content: `You are a NeoAi documentation assistant. ${contextDescription}

<contexts>
${contextString}
</contexts>

User Question: ${liveDocsQuery.query}

Instructions:
- Answer using the provided context and your knowledge of NeoAi and it's architecture
- Be concise and practical
- Include specific steps, commands, or examples when relevant
- If referencing context sources, add a **Sources** section with links
- IMPORTANT: When referencing sources, use ONLY the exact sourceLink URLs provided in the <contexts> above - do NOT generate or modify URLs
- For follow-up questions, build on previous conversation context
${contextCount === 0 ? '- No specific context sources available, provide general guidance' : ''}

Context Notes:
- All sources contain live content from NeoAi repositories
- Context accumulates through the conversation for comprehensive coverage
- ${isFirstMessage ? 'Initial' : 'Additional'} sources were selected for relevance to this question`,
        timestamp: new Date().toISOString(),
      }];
    } catch (error) {
      console.error("Error in getting Live Docs Query:", error);
      
      // Show user-friendly error message
      toast({
        title: "Context fetch failed",
        description: "Failed to fetch live documentation context. Continuing with existing context.",
        variant: "destructive",
        duration: 4000,
      });
      
      // Use existing contexts if available, otherwise empty
      contexts = currentContexts;
      newContexts = [];
      
      // Create system message indicating context fetch failure
      initialMessages = [{
        sender: 'System',
        content: `You are a NeoAi documentation assistant. Context fetch failed - using ${contexts.length > 0 ? 'existing accumulated context' : 'general knowledge only'}.

${contexts.length > 0 ? `<contexts>
${contexts.map(ctx => `<context><content>${ctx.content}</content><sourceLink>${ctx.sourceLink.replace("/raw/", "/tree/")}</sourceLink></context>`).join('')}
</contexts>

` : ''}
User Question: ${messageToSend}

Instructions:
- Answer using ${contexts.length > 0 ? 'the provided context and ' : ''}your knowledge of NeoAi and it's architecture
- Be concise and practical
- Include specific steps, commands, or examples when relevant
- ${contexts.length > 0 ? 'If referencing context sources, add a **Sources** section with links' : 'Provide general guidance based on NeoAi best practices'}
- ${contexts.length > 0 ? 'IMPORTANT: When referencing sources, use ONLY the exact sourceLink URLs provided in the <contexts> above - do NOT generate or modify URLs' : ''}
- For follow-up questions, build on previous conversation context

Context Notes:
- Live context fetching temporarily unavailable
- ${contexts.length > 0 ? 'Using previously accumulated context from this conversation' : 'Response based on general NeoAi knowledge'}`,
        timestamp: new Date().toISOString(),
      }];
    }

    const userMessage: EnhancedChatMessage = {
      sender: 'Human',
      content: messageToSend,
      timestamp: new Date().toISOString(),
      contexts: newContexts.length > 0 ? newContexts : undefined, // Store only the new contexts for this message
      accumulatedContexts: contexts, // Store all accumulated contexts for this message
    };


    const newMessages = [...messages, ...initialMessages, userMessage];
    setMessages(newMessages);

    // Function to attempt sending with given contexts
    const attemptSendWithContexts = async (attemptContexts: Array<{ content: string; sourceLink: string; }>, attemptNumber: number = 1): Promise<void> => {
      // Rebuild system message with current contexts
      const contextString = attemptContexts.map(context => 
        `<context><content>${context.content}</content><sourceLink>${context.sourceLink.replace("/raw/", "/tree/")}</sourceLink></context>`
      ).join('');
      
      const isFirstMessage = messages.length === 0;
      const contextCount = attemptContexts.length;
      
      const contextDescription = isFirstMessage 
        ? `Found ${contextCount} relevant documentation sources${attemptNumber > 1 ? ` (reduced due to token limit)` : ''}:`
        : `Using ${contextCount} accumulated sources${attemptNumber > 1 ? ` (reduced due to token limit)` : ''}:`;
      
      const updatedSystemMessage: EnhancedChatMessage = {
        sender: 'System',
        content: `You are a NeoAi documentation assistant. ${contextDescription}

<contexts>
${contextString}
</contexts>

User Question: ${messageToSend}

Instructions:
- Answer using the provided context and your knowledge of NeoAi and it's architecture
- Be concise and practical
- Include specific steps, commands, or examples when relevant
- If referencing context sources, add a **Sources** section with links
- IMPORTANT: When referencing sources, use ONLY the exact sourceLink URLs provided in the <contexts> above - do NOT generate or modify URLs
- For follow-up questions, build on previous conversation context
${contextCount === 0 ? '- No specific context sources available, provide general guidance' : ''}

Context Notes:
- All sources contain live content from NeoAi repositories
- Context accumulates through the conversation for comprehensive coverage
- ${isFirstMessage ? 'Initial' : 'Additional'} sources were selected for relevance to this question${attemptNumber > 1 ? ` (Context reduced to fit token limits)` : ''}`,
        timestamp: new Date().toISOString(),
      };

      const attemptMessages = [...messages, updatedSystemMessage, userMessage];
      setMessages(attemptMessages);
      
      try {
        /* eslint @typescript-eslint/no-explicit-any: 0 */  // --> OFF
        const stream = await sendChatMessage(attemptMessages as any, null, null, null, true);

        let aiMessage: EnhancedChatMessage = {
          sender: 'AI',
          content: '',
          timestamp: new Date().toISOString(),
        };

        for await (const chunk of stream) {
          aiMessage = {
            ...aiMessage,
            content: aiMessage.content + chunk,
          };
          setMessages([...attemptMessages, aiMessage]);
        }
        
        // Update current contexts with the successfully used contexts
        setCurrentContexts(attemptContexts);
        
      } catch (error) {
        console.error(`Error sending message (attempt ${attemptNumber}):`, error);
        
        // Check if this is a token limit error and we haven't reduced contexts too much
        if (isTokenLimitError(error) && attemptContexts.length > 1 && attemptNumber < 4) {
          toast({
            title: "Context too large",
            description: `Reducing context size and retrying (attempt ${attemptNumber + 1}/4)...`,
            duration: 3000,
          });
          
          // Reduce contexts and retry
          const reductionFactor = 0.4 + (attemptNumber * 0.1); // Reduce by 40%, 50%, 60% in subsequent attempts
          const reducedContexts = reduceContextsForTokenLimit(attemptContexts, reductionFactor);
          
          // Retry with reduced contexts
          await attemptSendWithContexts(reducedContexts, attemptNumber + 1);
        } else {
          // Not a token limit error, or we've reduced contexts too much, or max attempts reached
          const errorMessage = isTokenLimitError(error) 
            ? "Context is too large even after reduction. Please try a shorter query or start a new conversation."
            : "Failed to send message. Please try again.";
          
          toast({
            title: "Error sending message",
            description: errorMessage,
            variant: "destructive",
            duration: 4000,
          });
          
          // Revert to previous message state
          setMessages(newMessages.slice(0, -2)); // Remove system message and user message
          throw error;
        }
      }
    };

    try {
      await attemptSendWithContexts(contexts);
    } catch (error) {
      // Final error handling - this will only be reached if all retries failed
      console.error('All retry attempts failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMultiline) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-full bg-background">
        {/* Chat History Sidebar */}
        <div className="w-80 flex-shrink-0 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <ChatHistorySidebar
            type="docs"
            onSelectChat={loadChatFromHistory}
            onNewChat={startNewChat}
            onDeleteChat={handleChatDeleted}
            currentChatId={currentChatId}
            updateTrigger={historyUpdateTrigger}
          />
        </div>
        
        {(submitting || refreshingContext) && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="text-white text-lg font-semibold flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>
                {refreshingContext ? 'Refreshing context from live repositories...' : 'Fetching live context...'}
              </span>
            </div>
          </div>
        )}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header - Fixed at top */}
        <div className="border-b p-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Docs Assistant</h1>
              {chatTitle && (
                <span className="text-sm text-muted-foreground">• {chatTitle}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Ask questions with real-time context from NeoAi Runbooks and Handbook</p>
            {currentContexts.length > 35 && (
              <div className="text-xs text-amber-600 mt-1">
                ⚠️ Large context loaded - may auto-reduce if token limit exceeded
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentContexts.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="flex items-center gap-1 cursor-help">
                    <FileText className="h-3 w-3" />
                    <span>{currentContexts.length} live sources</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md">
                  <div className="space-y-1">
                    <div className="font-semibold text-xs">Live Sources:</div>
                    {currentContexts.slice(0, 10).map((context, index) => {
                      const fileName = context.sourceLink.split('/').pop() || 'Unknown file';
                      const repoMatch = context.sourceLink.match(/neoai\.com\/([^\/]+\/[^\/]+)/);
                      const repoName = repoMatch ? repoMatch[1] : 'Unknown repo';
                      // Convert raw URL to tree view URL
                      const treeUrl = context.sourceLink.replace('/raw/', '/tree/');
                      return (
                        <div key={index} className="text-xs text-left">
                          <a 
                            href={treeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-blue-400 hover:text-blue-300 hover:underline block"
                          >
                            {fileName}
                          </a>
                          <div className="text-gray-400 text-xs">{repoName}</div>
                        </div>
                      );
                    })}
                    {currentContexts.length > 10 && (
                      <div className="text-xs text-gray-400">
                        ... and {currentContexts.length - 10} more files
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Messages - Scrollable area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {messages
              .filter((message) => message.sender !== 'System')
              .map((message, index) => (
                <div key={index} className="flex gap-3">
                  <Avatar className={`h-8 w-8 ${message.sender === 'AI' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    <AvatarFallback>
                      {message.sender === 'AI' ? (
                        <Bot className="h-4 w-4 text-blue-500" />
                      ) : (
                        <User className="h-4 w-4 text-green-500" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{message.sender}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                      {message.contexts && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-xs cursor-help">
                              {message.contexts.length} sources
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-md">
                            <div className="space-y-1">
                              <div className="font-semibold text-xs">Sources for this message:</div>
                              {message.contexts.slice(0, 10).map((context, index) => {
                                const fileName = context.sourceLink.split('/').pop() || 'Unknown file';
                                const repoMatch = context.sourceLink.match(/neoai\.com\/([^\/]+\/[^\/]+)/);
                                const repoName = repoMatch ? repoMatch[1] : 'Unknown repo';
                                // Convert raw URL to tree view URL
                                const treeUrl = context.sourceLink.replace('/raw/', '/tree/');
                                return (
                                  <div key={index} className="text-xs text-left">
                                    <a 
                                      href={treeUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="font-medium text-blue-400 hover:text-blue-300 hover:underline block"
                                    >
                                      {fileName}
                                    </a>
                                    <div className="text-gray-400 text-xs">{repoName}</div>
                                  </div>
                                );
                              })}
                              {message.contexts.length > 10 && (
                                <div className="text-xs text-gray-400">
                                  ... and {message.contexts.length - 10} more files
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <Markdown contents={message.content} />
                    </div>
                    
                    {/* Message Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {message.sender === 'Human' && message.contexts && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refreshContext(index + 1)}
                          disabled={refreshingContext}
                          title="Refresh context from live repositories"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span className="text-xs ml-1">Refresh</span>
                        </Button>
                      )}
                      {message.sender === 'AI' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => regenerateResponse(index + 1)}
                          disabled={submitting}
                          title="Regenerate response"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.content, index)}
                        className={copiedMessageIndex === index ? 'text-green-600' : ''}
                        title="Copy to clipboard"
                      >
                        {copiedMessageIndex === index ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input - Fixed at bottom */}
        <form onSubmit={sendMessage} className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky bottom-0">
          <div className="flex gap-2">
            <div className="flex-1">
              {isMultiline ? (
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask about NeoAi Runbooks and Handbook with live context..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={submitting}
                  rows={3}
                  className="resize-none"
                />
              ) : (
                <Input
                  placeholder="Ask about NeoAi Runbooks and Handbook with live context..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={submitting}
                />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMultiline(!isMultiline)}
              disabled={submitting}
            >
              {isMultiline ? '−' : '+'}
            </Button>
            <Button type="submit" disabled={submitting || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line. Type /reset to clear conversation.
            <br />
            <span className="text-green-600">💡 Context accumulates through conversation with live updates from NeoAi repositories</span>
          </div>
        </form>
      </div>
    </div>
    </TooltipProvider>
  );
}