"""Demo"""

import os
from dotenv import load_dotenv
load_dotenv() # pylint: disable=wrong-import-position

from readyapi import ReadyAPI
import uvicorn
from neopilot.integrations.readyapi import add_readyapi_endpoint
from neopilot import NeoPilotRemoteEndpoint, LangGraphAgent
from neopilot.crewai import CrewAIAgent
from greeting_agent.langgraph.agent import graph
from greeting_agent.crewai.agent import GreetAgentFlow

app = ReadyAPI()
sdk = NeoPilotRemoteEndpoint(
    agents=[
        LangGraphAgent(
            name="greeting_agent",
            description="This agent greets the user",
            graph=graph,
        ),
        CrewAIAgent(
            name="greeting_agent_crewai",
            description="This agent greets the user",
            flow=GreetAgentFlow(),
        )
    ],
)

add_readyapi_endpoint(app, sdk, "/neopilot", use_thread_pool=False)

def main():
    """Run the uvicorn server."""
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "greeting_agent.demo:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        reload_dirs=(
            ["."] +
            (["../../../sdk-python/neopilot"]
             if os.path.exists("../../../sdk-python/neopilot")
             else []
             )
        )
    )
