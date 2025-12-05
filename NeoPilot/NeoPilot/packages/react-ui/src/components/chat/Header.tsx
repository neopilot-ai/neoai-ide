import { HeaderProps } from "./props";
import { useChatContext } from "./ChatContext";
import { CopilotDevConsole } from "../dev-console";
import React from "react";

export const Header = ({}: HeaderProps) => {
  const { setOpen, icons, labels } = useChatContext();

  return (
    <div className="neoPilotHeader">
      <div>{labels.title}</div>
      <div className="neoPilotHeaderControls">
        <CopilotDevConsole />
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="neoPilotHeaderCloseButton"
        >
          {icons.headerCloseIcon}
        </button>
      </div>
    </div>
  );
};
