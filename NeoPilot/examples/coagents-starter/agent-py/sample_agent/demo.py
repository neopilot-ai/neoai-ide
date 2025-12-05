"""
This serves the "sample_agent" agent. This is an example of self-hosting an agent
through our ReadyAPI integration. However, you can also host in LangGraph platform.
"""

import os
from dotenv import load_dotenv
load_dotenv() # pylint: disable=wrong-import-position
# os.environ["LANGGRAPH_API"] = "false"

from readyapi import ReadyAPI
import uvicorn
from neopilot import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_readyapi_endpoint
from sample_agent.agent import graph

app = ReadyAPI()
add_langgraph_readyapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="sample_agent",
        description="An example agent to use as a starting point for your own agent.",
        graph=graph,
    ),
    path="/",
)

def main():
    """Run the uvicorn server."""
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "sample_agent.demo:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
