/**
 * <br/>
 * <img src="https://cdn.neopilot.ai/docs/neopilot/images/CopilotPopup.gif" width="500" />
 *
 * A chatbot popup component for the NeoPilot framework. The component allows for a high degree
 * of customization through various props and custom CSS.
 *
 * See [CopilotSidebar](/reference/components/chat/CopilotSidebar) for a sidebar version of this component.
 *
 * ## Install Dependencies
 *
 * This component is part of the [@neopilot/react-ui](https://npmjs.com/package/@neopilot/react-ui) package.
 *
 * ```shell npm2yarn \"@neopilot/react-ui"\
 * npm install @neopilot/react-core @neopilot/react-ui
 * ```
 * ## Usage
 *
 * ```tsx
 * import { CopilotPopup } from "@neopilot/react-ui";
 * import "@neopilot/react-ui/styles.css";
 *
 * <CopilotPopup
 *   labels={{
 *     title: "Your Assistant",
 *     initial: "Hi! 👋 How can I assist you today?",
 *   }}
 * />
 * ```
 *
 * ### With Observability Hooks
 *
 * To monitor user interactions, provide the `observabilityHooks` prop.
 * **Note:** This requires a `publicApiKey` in the `<NeoPilot>` provider.
 *
 * ```tsx
 * <NeoPilot publicApiKey="YOUR_PUBLIC_API_KEY">
 *   <CopilotPopup
 *     observabilityHooks={{
 *       onChatExpanded: () => {
 *         console.log("Popup opened");
 *       },
 *       onChatMinimized: () => {
 *         console.log("Popup closed");
 *       },
 *     }}
 *   />
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

import { CopilotModal, CopilotModalProps } from "./Modal";

export function CopilotPopup(props: CopilotModalProps) {
  props = {
    ...props,
    className: props.className ? props.className + " neoPilotPopup" : "neoPilotPopup",
  };
  return <CopilotModal {...props}>{props.children}</CopilotModal>;
}
