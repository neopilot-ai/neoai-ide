"""Demo"""

import os
from dotenv import load_dotenv 
load_dotenv()

# pylint: disable=wrong-import-position
from readyapi import ReadyAPI
import uvicorn
from neopilot.integrations.readyapi import add_readyapi_endpoint
from neopilot import NeoPilotSDK, LangGraphAgent
from tutorial_quickstart.agent import graph

app = ReadyAPI()
sdk = NeoPilotSDK(
    agents=[
        LangGraphAgent(
            name="quickstart_agent",
            description="Quickstart agent.",
            graph=graph,
        ),
    ],
)

add_readyapi_endpoint(app, sdk, "/neopilot")

# add new route for health check
@app.get("/health")
def health():
    """Health check."""
    return {"status": "ok"}


def main():
    """Run the uvicorn server."""
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("tutorial_quickstart.demo:app", host="0.0.0.0", port=port)
