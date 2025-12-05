import { ButtonProps } from "./props";
import { useChatContext } from "./ChatContext";

export const Button = ({}: ButtonProps) => {
  const { open, setOpen, icons } = useChatContext();

  return (
    <div onClick={() => setOpen(!open)}>
      <button
        className={`neoPilotButton ${open ? "open" : ""}`}
        aria-label={open ? "Close Chat" : "Open Chat"}
      >
        <div className="neoPilotButtonIcon neoPilotButtonIconOpen">{icons.openIcon}</div>
        <div className="neoPilotButtonIcon neoPilotButtonIconClose">{icons.closeIcon}</div>
      </button>
    </div>
  );
};
