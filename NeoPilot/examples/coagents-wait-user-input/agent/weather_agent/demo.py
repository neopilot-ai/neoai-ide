"""Demo"""

import os
from dotenv import load_dotenv
load_dotenv() # pylint: disable=wrong-import-position

from readyapi import ReadyAPI
import uvicorn
from neopilot.integrations.readyapi import add_readyapi_endpoint
from neopilot import NeoPilotRemoteEndpoint, LangGraphAgent
from weather_agent.agent import graph


app = ReadyAPI()
sdk = NeoPilotRemoteEndpoint(
    agents=[
        LangGraphAgent(
            name="weather_agent",
            description="This agent deals with everything weather related",
            graph=graph,
        )
    ],
)

add_readyapi_endpoint(app, sdk, "/neopilot")

def main():
    """Run the uvicorn server."""
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "weather_agent.demo:app",
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
