"use client";

import React from "react";
import { Frame } from "./frame";

export function NeoPilotCSS() {
  return (
    <style suppressHydrationWarning>
      {`
/* src/css/colors.css */
html {
  --copilot-kit-primary-color: rgb(28, 28, 28);
  --copilot-kit-contrast-color: rgb(255, 255, 255);
  --copilot-kit-background-color: rgb(255 255 255);
  --copilot-kit-secondary-color: rgb(255 255 255);
  --copilot-kit-secondary-contrast-color: rgb(28, 28, 28);
  --copilot-kit-separator-color: rgb(200 200 200);
  --copilot-kit-muted-color: rgb(200 200 200);
  --copilot-kit-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --copilot-kit-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --copilot-kit-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* src/css/popup.css */
.neoPilotPopup {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 30;
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
    "Segoe UI Symbol", "Noto Color Emoji";
  font-feature-settings: normal;
  font-variation-settings: normal;
  touch-action: manipulation;
}
.neoPilotPopup svg {
  display: inline-block;
  vertical-align: middle;
}

/* src/css/sidebar.css */
.neoPilotSidebar {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 30;
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
    "Segoe UI Symbol", "Noto Color Emoji";
  font-feature-settings: normal;
  font-variation-settings: normal;
  touch-action: manipulation;
}
.neoPilotSidebar svg {
  display: inline-block;
  vertical-align: middle;
}
.neoPilotSidebarContentWrapper {
  overflow: visible;
  margin-right: 0px;
  transition: margin-right 0.3s ease;
}
@media (min-width: 640px) {
  .neoPilotSidebarContentWrapper.sidebarExpanded {
    margin-right: 28rem;
  }
}

/* src/css/button.css */
.neoPilotButton {
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--copilot-kit-primary-color);
  outline: none;
  position: relative;
  transform: scale(1);
  transition: all 0.2s ease;
  background-color: var(--copilot-kit-primary-color);
  color: var(--copilot-kit-contrast-color);
  cursor: pointer;
  box-shadow: var(--copilot-kit-shadow-sm);
}
.neoPilotButton:hover {
  transform: scale(1.05);
  box-shadow: var(--copilot-kit-shadow-md);
}
.neoPilotButton:active {
  transform: scale(0.95);
  box-shadow: var(--copilot-kit-shadow-sm);
}
.neoPilotButtonIcon {
  transition: opacity 100ms, transform 300ms;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.neoPilotButtonIcon svg {
  width: 1.5rem;
  height: 1.5rem;
}
.neoPilotButton.open .neoPilotButtonIconOpen {
  transform: translate(-50%, -50%) scale(0) rotate(90deg);
  opacity: 0;
}
.neoPilotButton.open .neoPilotButtonIconClose {
  transform: translate(-50%, -50%) scale(1) rotate(0deg);
  opacity: 1;
}
.neoPilotButton:not(.open) .neoPilotButtonIconOpen {
  transform: translate(-50%, -50%) scale(1) rotate(0deg);
  opacity: 1;
}
.neoPilotButton:not(.open) .neoPilotButtonIconClose {
  transform: translate(-50%, -50%) scale(0) rotate(-90deg);
  opacity: 0;
}

/* src/css/header.css */
.neoPilotHeader {
  height: 56px;
  font-weight: 500;
  display: flex;
  align-items: center;
  position: relative;
  color: var(--copilot-kit-primary-color);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom: 1px solid var(--copilot-kit-separator-color);
  padding-left: 1.5rem;
  background-color: var(--copilot-kit-contrast-color);
  justify-content: space-between;
  z-index: 2;
}
.neoPilotSidebar .neoPilotHeader {
  border-radius: 0;
}
.neoPilotHeaderControls {
  display: flex;
}
@media (min-width: 640px) {
  .neoPilotHeader {
    padding-left: 1.5rem;
    padding-right: 24px;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }
}
.neoPilotHeader > button {
  border: 0;
  padding: 8px;
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  outline: none;
  color: var(--copilot-kit-muted-color);
  background-color: transparent;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  width: 35px;
  height: 35px;
}
.neoPilotHeader > button:hover {
  color: color-mix(in srgb, var(--copilot-kit-muted-color) 80%, black);
}
.neoPilotHeader > button:focus {
  outline: none;
}

/* src/css/input.css */
.neoPilotInput {
  display: flex;
  flex-direction: column;
  cursor: text;
  position: relative;
  background-color: var(--copilot-kit-background-color);
  border-radius: 20px;
  border: 1px solid var(--copilot-kit-separator-color);
  padding: 12px 14px;
  height: 75px;
  margin: 0 auto;
  width: 95%;
}
.neoPilotInputContainer {
  width: 100%;
  padding: 0;
  background: var(--copilot-kit-background-color);
  border-bottom-left-radius: 0.75rem;
  border-bottom-right-radius: 0.75rem;
}
.neoPilotInputControlButton {
  padding: 0;
  cursor: pointer;
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
  transform: scale(1);
  color: rgba(0, 0, 0, 0.25);
  -webkit-appearance: button;
  appearance: button;
  background-color: transparent;
  background-image: none;
  text-transform: none;
  font-family: inherit;
  font-size: 100%;
  font-weight: inherit;
  line-height: inherit;
  border: 0;
  margin: 0;
  text-indent: 0px;
  text-shadow: none;
  display: inline-block;
  text-align: center;
  width: 24px;
  height: 24px;
}
.neoPilotInputControlButton:not([disabled]) {
  color: var(--copilot-kit-primary-color);
}
.neoPilotInputControlButton:not([disabled]):hover {
  color: color-mix(in srgb, var(--copilot-kit-primary-color) 80%, black);
  transform: scale(1.05);
}
.neoPilotInputControlButton[disabled] {
  color: var(--copilot-kit-muted-color);
  cursor: default;
}
.neoPilotInputControls {
  display: flex;
  gap: 3px;
}
.neoPilotInput > input {
  flex: 1;
  outline: 2px solid transparent;
  outline-offset: 2px;
  resize: none;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  cursor: text;
  font-size: 0.875rem;
  line-height: 1.5rem;
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-weight: inherit;
  color: var(--copilot-kit-secondary-contrast-color);
  border: 0px;
  background-color: var(--copilot-kit-background-color);
}
.neoPilotInput > textarea::placeholder {
  color: var(--copilot-kit-muted-color);
  opacity: 1;
}
.neoPilotInputControlButton.neoPilotPushToTalkRecording {
  background-color: #ec0000;
  color: white;
  border-radius: 50%;
  animation: neoPilotPulseAnimation 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* src/css/messages.css */
.neoPilotMessages {
  overflow-y: scroll;
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--copilot-kit-background-color);
  justify-content: space-between;
  z-index: 1;
}
.neoPilotMessagesContainer {
  padding: 1rem 24px;
  display: flex;
  flex-direction: column;
}
.neoPilotMessagesFooter {
  display: flex;
  padding: 0;
  margin: 0 auto 8px auto;
  justify-content: flex-start;
  flex-direction: column;
  width: 90%;
}
.neoPilotMessages::-webkit-scrollbar {
  width: 6px;
}
.neoPilotMessages::-webkit-scrollbar-thumb {
  background-color: var(--copilot-kit-separator-color);
  border-radius: 10rem;
  border: 2px solid var(--copilot-kit-background-color);
}
.neoPilotMessages::-webkit-scrollbar-track-piece:start {
  background: transparent;
}
.neoPilotMessages::-webkit-scrollbar-track-piece:end {
  background: transparent;
}
.neoPilotMessage {
  border-radius: 15px;
  padding: 8px 12px;
  font-size: 1rem;
  line-height: 1.5;
  overflow-wrap: break-word;
  max-width: 80%;
  margin-bottom: 0.5rem;
  color: var(--copilot-kit-secondary-contrast-color);
}
.neoPilotMessage.neoPilotUserMessage {
  background: var(--copilot-kit-primary-color);
  color: var(--copilot-kit-contrast-color);
  margin-left: auto;
  white-space: pre-wrap;
  line-height: 1.75;
  font-size: 1rem;
}
.neoPilotMessage.neoPilotAssistantMessage {
  background: transparent;
  margin-right: auto;
  padding-left: 0;
  position: relative;
  max-width: 100%;
}
.neoPilotMessage.neoPilotAssistantMessage + .neoPilotMessage.neoPilotUserMessage {
  margin-top: 1.5rem;
}
.neoPilotCustomAssistantMessage {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}
.neoPilotMessage .inProgressLabel {
  margin-left: 10px;
  opacity: 0.7;
}

/* src/css/suggestions.css */
.neoPilotMessages footer .suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.neoPilotMessages footer h6 {
  font-weight: 500;
  font-size: 0.7rem;
  margin-bottom: 8px;
}
.neoPilotMessages footer .suggestions .suggestion {
  padding: 6px 10px;
  font-size: 0.7rem;
  border-radius: 15px;
  border: 1px solid var(--copilot-kit-muted-color);
  color: var(--copilot-kit-secondary-contrast-color);
  box-shadow: 0 5px 5px 0px rgba(0,0,0,.01),0 2px 3px 0px rgba(0,0,0,.02);
}
.neoPilotMessages footer .suggestions .suggestion.loading {
  padding: 0;
  font-size: 0.7rem;
  border: none;
  color: var(--copilot-kit-secondary-contrast-color);
}
.neoPilotMessages footer .suggestions button {
  transition: transform 0.3s ease;
}
.neoPilotMessages footer .suggestions button:not(:disabled):hover {
  transform: scale(1.03);
}
.neoPilotMessages footer .suggestions button:disabled {
  cursor: wait;
}
.neoPilotMessages footer .suggestions button svg {
  margin-right: 6px;
}

/* src/css/markdown.css */
.neoPilotMarkdown h1,
.neoPilotMarkdown h2,
.neoPilotMarkdown h3,
.neoPilotMarkdown h4,
.neoPilotMarkdown h5,
.neoPilotMarkdown h6 {
  font-weight: bold;
  line-height: 1.2;
}
.neoPilotMarkdown h1:not(:last-child),
.neoPilotMarkdown h2:not(:last-child),
.neoPilotMarkdown h3:not(:last-child),
.neoPilotMarkdown h4:not(:last-child),
.neoPilotMarkdown h5:not(:last-child),
.neoPilotMarkdown h6:not(:last-child) {
  margin-bottom: 1rem;
}
.neoPilotMarkdown h1 {
  font-size: 1.5em;
}
.neoPilotMarkdown h2 {
  font-size: 1.25em;
  font-weight: 600;
}
.neoPilotMarkdown h3 {
  font-size: 1.1em;
}
.neoPilotMarkdown h4 {
  font-size: 1em;
}
.neoPilotMarkdown h5 {
  font-size: 0.9em;
}
.neoPilotMarkdown h6 {
  font-size: 0.8em;
}
.neoPilotMarkdown p:not(:last-child) {
  margin-bottom: 1.25em;
}
.neoPilotMarkdown pre:not(:last-child) {
  margin-bottom: 1.25em;
}
.neoPilotMarkdown blockquote {
  border-color: rgb(142, 142, 160);
  border-left-width: 2px;
  border-left-style: solid;
  line-height: 1.2;
  padding-left: 10px;
}
.neoPilotMarkdown blockquote p {
  padding: 0.7em 0;
}
.neoPilotMarkdown ul {
  list-style-type: disc;
  padding-left: 20px;
  overflow: visible;
}
.neoPilotMarkdown li {
  list-style-type: inherit;
  list-style-position: outside;
  margin-left: 0;
  padding-left: 0;
  position: relative;
  overflow: visible;
}
.neoPilotCodeBlock {
  position: relative;
  width: 100%;
  background-color: rgb(9 9 11);
  border-radius: 0.375rem;
}
.neoPilotCodeBlockToolbar {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  background-color: rgb(39 39 42);
  padding-left: 1rem;
  padding-top: 0.09rem;
  padding-bottom: 0.09rem;
  color: rgb(228, 228, 228);
  border-top-left-radius: 0.375rem;
  border-top-right-radius: 0.375rem;
  font-family: sans-serif;
}
.neoPilotCodeBlockToolbarLanguage {
  font-size: 0.75rem;
  line-height: 1rem;
  text-transform: lowercase;
}
.neoPilotCodeBlockToolbarButtons {
  display: flex;
  align-items: center;
  margin-right: 0.25rem;
  margin-left: 0.25rem;
}
.neoPilotCodeBlockToolbarButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  height: 2.5rem;
  width: 2.5rem;
  padding: 3px;
  margin: 2px;
}
.neoPilotCodeBlockToolbarButton:hover {
  background-color: rgb(55, 55, 58);
}

/* src/css/window.css */
.neoPilotWindow {
  position: fixed;
  inset: 0px;
  transform-origin: bottom;
  border-color: rgb(229 231 235);
  background-color: rgb(255 255 255);
  border-radius: 0.75rem;
  box-shadow: rgba(0, 0, 0, 0.16) 0px 5px 40px;
  flex-direction: column;
  transition: opacity 100ms ease-out, transform 200ms ease-out;
  opacity: 0;
  transform: scale(0.95) translateY(20px);
  display: flex;
  pointer-events: none;
}
.neoPilotSidebar .neoPilotWindow {
  border-radius: 0;
  opacity: 1;
  transform: translateX(100%);
}
.neoPilotWindow.open {
  opacity: 1;
  transform: scale(1) translateY(0);
  pointer-events: auto;
}
.neoPilotSidebar .neoPilotWindow.open {
  transform: translateX(0);
}
@media (min-width: 640px) {
  .neoPilotWindow {
    transform-origin: bottom right;
    bottom: 5rem;
    right: 1rem;
    top: auto;
    left: auto;
    border-width: 0px;
    margin-bottom: 1rem;
    width: 24rem;
    height: 600px;
    min-height: 200px;
    max-height: calc(100% - 6rem);
  }
  .neoPilotSidebar .neoPilotWindow {
    bottom: 0;
    right: 0;
    top: auto;
    left: auto;
    width: 28rem;
    min-height: 100%;
    margin-bottom: 0;
    max-height: none;
  }
}

/* src/css/animations.css */
.neoPilotActivityDot1 {
  animation: neoPilotActivityDotsAnimation 1.05s infinite;
}
.neoPilotActivityDot2 {
  animation-delay: 0.1s;
}
.neoPilotActivityDot3 {
  animation-delay: 0.2s;
}
@keyframes neoPilotActivityDotsAnimation {
  0%,
  57.14% {
    animation-timing-function: cubic-bezier(0.33, 0.66, 0.66, 1);
    transform: translate(0);
  }
  28.57% {
    animation-timing-function: cubic-bezier(0.33, 0, 0.66, 0.33);
    transform: translateY(-6px);
  }
  100% {
    transform: translate(0);
  }
}
@keyframes neoPilotSpinAnimation {
  to {
    transform: rotate(360deg);
  }
}
@keyframes neoPilotPulseAnimation {
  50% {
    opacity: 0.5;
  }
}

/* src/css/panel.css */
.neoPilotChat {
  z-index: 30;
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;
  background: var(--copilot-kit-background-color);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
    "Segoe UI Symbol", "Noto Color Emoji";
  font-feature-settings: normal;
  font-variation-settings: normal;
  touch-action: manipulation;
  display: flex;
  flex-direction: column;
}
.neoPilotChat svg {
  display: inline-block;
  vertical-align: middle;
}
.neoPilotChat .neoPilotMessages {
  flex-grow: 1;
}
.tooltip {
  display: none;
  position: absolute;
  background-color: var(--copilot-kit-background-color);
  border: 1px solid var(--copilot-kit-separator-color);
  color: var(--copilot-kit-secondary-contrast-color);
  padding: 15px;
  border-radius: 5px;
  z-index: 1000;
  font-size: 13px;
  width: 350px;
  box-shadow: var(--copilot-kit-shadow-md);
}
.tooltip b {
  color: var(--copilot-kit-primary-color);
  font-family: monospace;
}

.neoPilotInput {
  cursor: pointer;
}

.neoPilotInput input {
  flex: 1;
  outline: 2px solid transparent;
  outline-offset: 2px;
  resize: none;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1.25rem;
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-weight: inherit;
  color: var(--copilot-kit-secondary-contrast-color);
  border: 0px;
  background-color: var(--copilot-kit-background-color);
}

.micButton:hover {
  border-radius: 5px;
}

.sendButton:hover {
  border-radius: 5px;
}

.poweredBy {
  visibility: visible !important;
  display: block !important;
  position: static !important;
  text-align: center !important;
  font-size: 12px !important;
  padding: 3px 0 !important;
  color: rgb(214, 214, 214) !important;
  margin: 0 !important;
}

.dark,
html.dark,
body.dark,
[data-theme="dark"],
html[style*="color-scheme: dark"],
body[style*="color-scheme: dark"] .poweredBy {
  color: rgb(69, 69, 69) !important;
}
    `}
    </style>
  );
}

export const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
  const tooltip = document.querySelector(".tooltip") as HTMLElement | null;
  if (!tooltip || !tooltip.parentElement) return;
  tooltip.style.display = "block";
  const rect = tooltip.parentElement.getBoundingClientRect();
  tooltip.style.left = `${e.clientX - rect.left + 15}px`;
  tooltip.style.top = `${e.clientY - rect.top + 15}px`;

  let element = e.target as HTMLElement;

  while (element && element !== document.body) {
    if (element.classList.contains("neoPilotHeader")) {
      tooltip.innerHTML =
        "<b>--copilot-kit-contrast-color</b>: Header background color.<br/><br/><b>--copilot-kit-primary-color</b>: Header text color.";
      return;
    } else if (element.classList.contains("neoPilotAssistantMessage")) {
      tooltip.innerHTML =
        "<b>--copilot-kit-secondary-contrast-color</b>: Assistant message text color.<br/><br/><b>--copilot-kit-primary-color</b>: Assistant message action buttons color.";
      return;
    } else if (element.classList.contains("neoPilotUserMessage")) {
      tooltip.innerHTML =
        "<b>--copilot-kit-primary-color</b>: User message background color.<br/><br/><b>--copilot-kit-contrast-color</b>: User message text color.";
      return;
    } else if (element.classList.contains("neoPilotMessages")) {
      tooltip.innerHTML =
        "<b>--copilot-kit-background-color</b>: Chat window background color.<br/><br/><b>--copilot-kit-separator-color</b>: Chat window scrollbar color.";
      return;
    } else if (element.classList.contains("sendButton")) {
      tooltip.innerHTML =
        "<b>--copilot-kit-primary-color</b>: Active button color";
      return;
    } else if (element.classList.contains("micButton")) {
      tooltip.innerHTML =
        "<b>--copilot-kit-muted-color</b>: Muted button color";
      return;
    } else if (element.classList.contains("neoPilotInput")) {
      tooltip.innerHTML =
        "<b>--copilot-kit-separator-color</b>: Input box border color.<br/><br/><b>--copilot-kit-muted-color</b>: Placeholder color.";
      return;
    } else if (element.classList.contains("poweredBy")) {
      tooltip.innerHTML =
          `The "Powered by NeoPilot" watermark is removed automatically for Copilot Cloud users`;
      return;
    }
    element = element.parentElement as HTMLElement;
  }

  tooltip.style.display = "none";
};

export const handleMouseLeave = (_e: React.MouseEvent<HTMLElement>) => {
  const tooltip = document.querySelector(".tooltip") as HTMLElement | null;
  if (tooltip) tooltip.style.display = "none";
};

export const InteractiveCSSInspector = () => {
  return (
    <>
      <div className="tooltip">Close NeoPilot</div>
      <Frame className="">
        <div
          className=""
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            width: "384px",
            cursor: "pointer",
          }}
        >
          <div className="open">
            <div className="neoPilotHeader">
              <div>NeoPilot</div>
              <button aria-label="Close">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  width={24}
                  height={24}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="neoPilotMessages">
              <div className="neoPilotMessagesContainer">
                <div className="neoPilotMessage neoPilotAssistantMessage">
                  Hi you! 👋 I can help you create a presentation on any topic.
                </div>
                <div className="neoPilotMessage neoPilotUserMessage">
                  Hello NeoPilot!
                </div>
              </div>
            </div>
            <div className="neoPilotInputContainer">
              <div className="neoPilotInput">
                <input
                    placeholder="Type a message..."
                    // style={{
                    //   overflow: "auto",
                    //   resize: "none",
                    //   maxHeight: 100,
                    //   height: 20,
                    // }}
                    defaultValue={""}
                    disabled={false}
                />
                <div className="neoPilotInputControls">
                  <div style={{ flexGrow: 1 }} />
                  <button className="micButton neoPilotInputControlButton" disabled>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6"
                    >
                      <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                      />
                    </svg>
                  </button>
                  <button className="sendButton neoPilotInputControlButton" disabled={false}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        width="24"
                        height="24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="poweredBy">
                Powered by NeoPilot
              </p>
            </div>
          </div>
        </div>
      </Frame>
    </>
  );
};
