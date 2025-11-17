'use client'

import { useEffect, useState, useMemo } from 'react'
import Chat from './chat'
import Preview from './preview'
import Editor from './editor'
import TypeSelector from './type_selector'
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Navbar from '../navbar'
import { ComposerChatMessage } from '@/app/lib/actions/composer/chat_message'
import { Entity, sendChatMessage } from '@/app/lib/actions/composer/actions'
import { fetchIssue, saveIssue } from '@/app/lib/actions/composer/issue'
import { useSession } from 'next-auth/react'
import Login from '../login'
import { fetchMergeRequest, saveMergeRequest } from '@/app/lib/actions/composer/mr'
import { useToast } from "@/hooks/use-toast"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { fetchEpic, saveEpic } from '@/app/lib/actions/composer/epic'
import { Epic } from '@/app/lib/actions/common/entities/epic'

interface StorageHistory {
  type?: 'issue' | 'mr' | 'email' | 'slack' | 'epic',
  messages?: ComposerChatMessage[],
  url?: string;
}

export default function Home() {
  const [type, setType] = useState<'issue' | 'mr' | 'email' | 'slack' | 'epic'>('issue');
  const [tone, setTone] = useState<string>('');

  const [messages, setMessages] = useState<ComposerChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [entity, setEntity] = useState<Entity | undefined>();
  const [selectedText, setSelectedText] = useState<string | undefined>();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number | null>(null);

  const { toast } = useToast();
  const { data: session } = useSession();

  const artifactVersions = useMemo(() => {
    const versions = messages.filter(m => m.artifact && m.artifact.trim().length > 0);
    if (versions.length > 0 && (selectedVersionIndex === null || selectedVersionIndex >= versions.length)) {
      setSelectedVersionIndex(versions.length - 1);
    }
    return versions;
  }, [messages, selectedVersionIndex]);

  useEffect(() => {
    if (window.localStorage.getItem("composer_chat") || window.localStorage.getItem("composer_chat_type")) {
      const storageItem = JSON.parse(window.localStorage.getItem("composer_chat") || '{}') as StorageHistory;
      if (storageItem) {
        const msgs = storageItem.messages || []; 
        setMessages(msgs);
        if (msgs && msgs.length > 0) {
          setContent(msgs[msgs.length - 1].artifact || '')
        }
        if (storageItem.type) {
          setType(storageItem.type);
        }
        if (storageItem.url) {
          setUrl(storageItem.url);
        }
      }
    }
  }, []);

  if (!session) {
    return (
      <Login />
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied",
        description: "Content copied to clipboard!",
        variant: "default"
      });
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const confirmSave = async () => {
    if (url) {
      if (url.indexOf("issues") > -1) {
        await saveIssue(url, content);
      } else if (url.indexOf("merge_requests") > -1) {
        await saveMergeRequest(url, content);
      } else if (url.indexOf("epics") > -1) {
        const epic = entity as Epic;
        await saveEpic(epic.id, content);
      }
  
      toast({
        title: "Saved",
        description: "Your record was saved successfully."
      });
    }
    setShowDialog(false);
  }

  const handleSave = () => {
    setShowDialog(true);
  }

  const handleReset = () => {
    setMessages([])
    setContent('')
    setUrl('');
    setTone('');
    setType('issue');
    localStorage.setItem("composer_chat", JSON.stringify({}))
  }

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value)
  }

  const handleLoad = async () => {
    let description = '';
    if (url.indexOf("issues") > -1) {
      const issue = await fetchIssue(url);
      setType('issue');
      setEntity(issue || undefined);
      description = issue?.description || '';
    } else if (url.indexOf("merge_requests") > -1) {
      const mr = await fetchMergeRequest(url);
      setType('mr');
      setEntity(mr || undefined);
      description = mr?.description || '';
    } else if (url.indexOf("epics") > -1) {
      const epic = await fetchEpic(url);
      setType('epic');
      setEntity(epic || undefined);
      description = epic?.description || '';
    }

    setMessages([]);
    setContent(description);
  }

  const onChatMessage = async (newMessage: string, commentSelectedText?: string) => {
    const message: ComposerChatMessage = {
      sender: 'user',
      content: newMessage,
      timestamp: new Date().toISOString(),
      artifact: content,
      diff: '',
    };

    const newMessages = [...messages, message];
    setMessages(newMessages);

    let aiMessage: ComposerChatMessage = {
      sender: 'assistant',
      content: '',
      artifact: '',
      diff: '',
      timestamp: new Date().toISOString(),
    };

    let settings: Entity = {};
    if (tone && (type === 'email' || type === 'slack')) {
      settings = {
        tone
      }
      setEntity(entity);
    } else if (entity) {
      settings = entity;
    }

    const stream = await sendChatMessage(type, newMessages, settings, selectedText || commentSelectedText)
    for await (const chunk of stream) {
      if (chunk) {
        aiMessage = {
          ...aiMessage,
          content: chunk.message,
          artifact: chunk.artifact || '',
        };
        const finalMessages = [...newMessages, aiMessage];
        setMessages(finalMessages);
        setContent(chunk.artifact || '')
        setSelectedVersionIndex(finalMessages.filter(m => m.artifact && m.artifact.trim().length > 0).length - 1);
      }
    }

    const storageItem: StorageHistory = {
      type,
      url: url || '',
      messages: [...newMessages, aiMessage]
    }

    localStorage.setItem("composer_chat", JSON.stringify(storageItem));
  }

  const handleVersionChange = (value: string) => {
    const idx = parseInt(value, 10);
    const selectedVersion = artifactVersions[idx];
    if (selectedVersion) {
      setContent(selectedVersion.artifact || '');
      setSelectedVersionIndex(idx);
    }
  }

  const toneOptionsForEmail = ["Default", "Formal", "Informal", "Humorous", "Friendly"];
  const toneOptionsForSlack = ["Default", "Lots of Emojis", "Funny", "Casual"];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Save</DialogTitle>
            <DialogDescription>
              This will write changes directly to NeoAi. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button variant="default" onClick={confirmSave}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pb-2">
        <Navbar showSettings={false} onThemeUpdate={(isDarkMode) => {
          setDarkMode(isDarkMode);
        }} />
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-1/4 border-r border-border flex flex-col">
          <TypeSelector type={type} setType={setType} />
          <div className="flex-1 overflow-auto">
            <Chat onChatMessage={onChatMessage} messages={messages} />
          </div>
        </div>

        {/* Right panel */}
        <div className="w-3/4 flex flex-col p-4 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">{type.toUpperCase()}</h1>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-mode"
                checked={isEditing}
                onCheckedChange={setIsEditing}
              />
              <Label htmlFor="edit-mode">{isEditing ? 'Edit Mode' : 'Preview Mode'}</Label>
            </div>
          </div>
          {/* URL input & buttons */}
          {(type === 'issue' || type === 'mr' || type === 'epic') ? (
            <div className="flex items-center space-x-2 mb-4">
              <Input
                type="url"
                placeholder="Enter issue/MR/epic URL"
                value={url}
                onChange={handleUrlChange}
                className="flex-grow"
              />
              <Button onClick={handleLoad} size="sm">Load</Button>
              <Button onClick={handleCopy} size="sm">Copy</Button>
              <Button onClick={handleSave} size="sm">Save</Button>
              <Button onClick={handleReset} size="sm">Reset</Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 mb-4">
              {(type === 'email' || type === 'slack') && (
                <div className="p-2">
                  <select
                    id="tone-select"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="border border-border bg-background text-foreground rounded p-1 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a tone</option>
                    {type === 'email' && toneOptionsForEmail.map((option, idx) => (
                      <option key={idx} value={option}>{option}</option>
                    ))}
                    {type === 'slack' && toneOptionsForSlack.map((option, idx) => (
                      <option key={idx} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
              <Button onClick={handleCopy} size="sm">Copy</Button>
              <Button onClick={handleReset} size="sm">Reset</Button>
            </div>
          )}

          {/* Version dropdown */}
          {artifactVersions.length > 0 && (
            <div className="mb-4">
              <Label htmlFor="versionSelect" className="mr-2">Version History:</Label>
              <select
                id="versionSelect"
                onChange={(e) => handleVersionChange(e.target.value)}
                value={selectedVersionIndex ?? artifactVersions.length - 1}
                className="border border-border bg-background text-foreground rounded p-1 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {artifactVersions.map((v, i) => {
                  const isLatest = (i === artifactVersions.length - 1);
                  const label = isLatest ? "Latest" : `Version ${i + 1}`;
                  const senderLabel = v.sender === 'assistant' ? "(AI)" : "(You)";
                  return (
                    <option key={i} value={i}>
                      {label} {senderLabel}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Preview/Editor area */}
          <div className="flex-1 overflow-auto border rounded-md">
            {isEditing ? (
              <Editor 
                content={content} 
                onUpdateContent={setContent} 
                darkMode={darkMode}
                onComment={async (comment, selectedText) => { 
                  await onChatMessage(comment, selectedText);
                }}
                onSelectionChange={setSelectedText} />
            ) : (
              <Preview content={content} onComment={async (comment, selectedText) => {
                await onChatMessage(comment, selectedText);
              }}/>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
