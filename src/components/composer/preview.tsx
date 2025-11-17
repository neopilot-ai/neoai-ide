'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import Markdown from '../ui/markdown';

interface PreviewProps {
  content: string;
  onComment?: (comment: string, selectedText: string) => void;
}

export default function Preview({ content, onComment }: PreviewProps) {
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const showCommentPopup = useCallback((x: number, y: number, text: string) => {
    if (popupRef.current) {
      popupRef.current.remove();
    }

    const popupContainer = document.createElement('div');
    popupContainer.style.position = 'fixed';
    popupContainer.style.left = `${x}px`;
    popupContainer.style.top = `${y + 10}px`; // Add a small offset
    popupContainer.style.background = '#fff';
    popupContainer.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
    popupContainer.style.border = '1px solid #dedede';
    popupContainer.style.padding = '12px';
    popupContainer.style.borderRadius = '6px';
    popupContainer.style.width = '280px';
    popupContainer.style.zIndex = '1000000';
    popupContainer.style.fontFamily = 'sans-serif';
    popupContainer.style.fontSize = '14px';

    popupContainer.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: 600;">Your comment:</div>
      <textarea
        id="userComment"
        rows="3"
        style="width: 100%; resize: none; padding: 8px; box-sizing: border-box; margin-bottom: 16px; border: 1px solid #dedede;"
        placeholder="Add a comment..."
      ></textarea>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button id="cancelButton"
          style="background: #e2e2e2; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;"
        >
          Cancel
        </button>
        <button id="submitButton"
          style="background: #007acc; border: none; padding: 8px 12px; border-radius: 4px; color: #fff; cursor: pointer;"
        >
          Submit
        </button>
      </div>
    `;

    document.body.appendChild(popupContainer);
    popupRef.current = popupContainer;

    const textarea = popupContainer.querySelector('#userComment') as HTMLTextAreaElement;
    textarea?.focus();

    function removePopup() {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      document.removeEventListener('mousedown', handleOutsideClick);
    }

    function handleOutsideClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        removePopup();
      }
    }

    setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
    }, 100);

    const cancelButton = popupContainer.querySelector('#cancelButton');
    const submitButton = popupContainer.querySelector('#submitButton');

    cancelButton?.addEventListener('click', removePopup);

    submitButton?.addEventListener('click', () => {
      const userComment = textarea.value;
      if (onComment && text) {
        onComment(userComment, text);
      }
      removePopup();
    });
  }, [onComment]);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== '') {
      const newSelectedText = selection.toString();
      setSelectedText(newSelectedText);
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      showCommentPopup(rect.left, rect.bottom, newSelectedText);
    } else {
      setSelectedText(null);
    }
  }, [showCommentPopup]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;

        // Restore the selection
        if (selectedText) {
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            const textNodes = getTextNodes(previewRef.current);
            let startNode: Node | null = null;
            let endNode: Node | null = null;
            let startOffset = 0;
            let endOffset = 0;

            for (let i = 0; i < textNodes.length; i++) {
              const node = textNodes[i];
              const nodeText = node.textContent || '';
              const startIndex = nodeText.indexOf(selectedText);

              if (startIndex !== -1) {
                startNode = node;
                startOffset = startIndex;
                endNode = node;
                endOffset = startIndex + selectedText.length;
                break;
              }
            }

            if (startNode && endNode) {
              range.setStart(startNode, startOffset);
              range.setEnd(endNode, endOffset);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedText]);

  const getTextNodes = (node: Node | null): Text[] => {
    const textNodes: Text[] = [];
    if (node) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
      let currentNode: Node | null;
      while ((currentNode = walker.nextNode())) {
        textNodes.push(currentNode as Text);
      }
    }
    return textNodes;
  };

  return (
    <ScrollArea className="h-full">
      <div
        className="p-4 prose dark:prose-invert max-w-none"
        ref={previewRef}
        onMouseUp={handleSelection}
      >
        <Markdown contents={content} />
      </div>
    </ScrollArea>
  );
}
