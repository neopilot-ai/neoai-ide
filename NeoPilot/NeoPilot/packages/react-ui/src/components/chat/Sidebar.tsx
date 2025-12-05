/**
 * <br/>
 * <img src="https://cdn.neopilot.ai/docs/neopilot/images/CopilotSidebar.gif" width="500" />
 *
 * A chatbot sidebar component for the NeoPilot framework. Highly customizable through various props and custom CSS.
 *
 * See [CopilotPopup](/reference/components/chat/CopilotPopup) for a popup version of this component.
 *
 * ## Install Dependencies
 *
 * This component is part of the [@neopilot/react-ui](https://npmjs.com/package/@neopilot/react-ui) package.
 *
 * ```shell npm2yarn \"@neopilot/react-ui"\
 * npm install @neopilot/react-core @neopilot/react-ui
 * ```
 *
 * ## Usage
 *
 * ```tsx
 * import { CopilotSidebar } from "@neopilot/react-ui";
 * import "@neopilot/react-ui/styles.css";
 *
 * <CopilotSidebar
 *   labels={{
 *     title: "Your Assistant",
 *     initial: "Hi! 👋 How can I assist you today?",
 *   }}
 * >
 *   <YourApp/>
 * </CopilotSidebar>
 * ```
 *
 * ### With Observability Hooks
 *
 * To monitor user interactions, provide the `observabilityHooks` prop.
 * **Note:** This requires a `publicApiKey` in the `<NeoPilot>` provider.
 *
 * ```tsx
 * <NeoPilot publicApiKey="YOUR_PUBLIC_API_KEY">
 *   <CopilotSidebar
 *     observabilityHooks={{
 *       onChatExpanded: () => {
 *         console.log("Sidebar opened");
 *       },
 *       onChatMinimized: () => {
 *         console.log("Sidebar closed");
 *       },
 *     }}
 *   >
 *     <YourApp/>
 *   </CopilotSidebar>
 * </NeoPilot>
 * ```
 *
 * ### Look & Feel
 *
 * By default, NeoPilot components do not have any styles. You can import NeoPilot's stylesheet at the root of your project:
 * ```tsx title="YourRootComponent.tsx"
 * ...
 * import "@neopilot/react-ui/styles.css"; // [!code highlight]
 *
 * export function YourRootComponent() {
 *   return (
 *     <NeoPilot>
 *       ...
 *     </NeoPilot>
 *   );
 * }
 * ```
 * For more information about how to customize the styles, check out the [Customize Look & Feel](/guides/custom-look-and-feel/customize-built-in-ui-components) guide.
 */
import React, { useState } from "react";
import { CopilotModal, CopilotModalProps } from "./Modal";

export function CopilotSidebar(props: CopilotModalProps) {
  props = {
    ...props,
    className: props.className ? props.className + " neoPilotSidebar" : "neoPilotSidebar",
  };
  const [expandedClassName, setExpandedClassName] = useState(
    props.defaultOpen ? "sidebarExpanded" : "",
  );

  const onSetOpen = (open: boolean) => {
    props.onSetOpen?.(open);
    setExpandedClassName(open ? "sidebarExpanded" : "");
  };

  return (
    <div className={`neoPilotSidebarContentWrapper ${expandedClassName}`}>
      <CopilotModal {...props} {...{ onSetOpen }}>
        {props.children}
      </CopilotModal>
    </div>
  );
}
