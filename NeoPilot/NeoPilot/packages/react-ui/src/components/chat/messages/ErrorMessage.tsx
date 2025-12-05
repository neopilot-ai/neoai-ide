import { ErrorMessageProps } from "../props";
import { useChatContext } from "../ChatContext";
import { Markdown } from "../Markdown";
import { useState } from "react";

export const ErrorMessage = (props: ErrorMessageProps) => {
  const { icons, labels } = useChatContext();
  const { error, onRegenerate, onCopy, isCurrentMessage } = props;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const content = error.message;
    if (content && onCopy) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy(content);
      setTimeout(() => setCopied(false), 2000);
    } else if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate) onRegenerate();
  };

  console.log(error);

  return (
    <div className="neoPilotMessage neoPilotAssistantMessage">
      <Markdown content={error.message} />

      <div className={`neoPilotMessageControls ${isCurrentMessage ? "currentMessage" : ""}`}>
        <button
          className="neoPilotMessageControlButton"
          onClick={handleRegenerate}
          aria-label={labels.regenerateResponse}
          title={labels.regenerateResponse}
        >
          {icons.regenerateIcon}
        </button>
        <button
          className="neoPilotMessageControlButton"
          onClick={handleCopy}
          aria-label={labels.copyToClipboard}
          title={labels.copyToClipboard}
        >
          {copied ? (
            <span style={{ fontSize: "10px", fontWeight: "bold" }}>✓</span>
          ) : (
            icons.copyIcon
          )}
        </button>
      </div>
    </div>
  );
};
