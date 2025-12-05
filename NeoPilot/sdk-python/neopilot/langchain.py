"""
neopilot.langchain is deprecated. Use neopilot.langgraph instead.
"""
import warnings
from neopilot.langgraph import (
  langchain_messages_to_neopilot,
  neopilot_messages_to_langchain,
  neopilot_customize_config,
  neopilot_exit,
  neopilot_emit_state,
  neopilot_emit_message,
  neopilot_emit_tool_call,
  neopilot_interrupt,
)

warnings.warn(
    "neopilot.langchain is deprecated. Use neopilot.langgraph instead.",
    DeprecationWarning,
    stacklevel=2
)

__all__ = [
  "langchain_messages_to_neopilot",
  "neopilot_messages_to_langchain",
  "neopilot_customize_config",
  "neopilot_exit",
  "neopilot_emit_state",
  "neopilot_emit_message",
  "neopilot_emit_tool_call",
  "neopilot_interrupt",
]
