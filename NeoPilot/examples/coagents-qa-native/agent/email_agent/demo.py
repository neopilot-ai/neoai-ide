"""Demo"""

import os
from dotenv import load_dotenv
load_dotenv() # pylint: disable=wrong-import-position

from readyapi import ReadyAPI
import uvicorn
from neopilot.integrations.readyapi import add_readyapi_endpoint
from neopilot import NeoPilotRemoteEndpoint, LangGraphAgent
from neopilot.crewai import CrewAIAgent
from email_agent.langgraph.agent import graph
from email_agent.crewai.agent import EmailAgentFlow
app = ReadyAPI()
sdk = NeoPilotRemoteEndpoint(
    agents=[
        LangGraphAgent(
            name="email_agent",
            description="This agent sends emails",
            graph=graph,
        ),
        CrewAIAgent(
            name="email_agent_crewai",
            description="This agent sends emails",
            flow=EmailAgentFlow(),
        ),
    ],
)

add_readyapi_endpoint(app, sdk, "/neopilot")

def main():
    """Run the uvicorn server."""
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "email_agent.demo:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
