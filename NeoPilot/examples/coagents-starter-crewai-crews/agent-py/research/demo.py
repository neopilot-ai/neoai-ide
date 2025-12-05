"""Demo"""

import os
from dotenv import load_dotenv
load_dotenv() # pylint: disable=wrong-import-position

from readyapi import ReadyAPI
import uvicorn
from neopilot.integrations.readyapi import add_readyapi_endpoint
from neopilot import NeoPilotRemoteEndpoint
from neopilot.crewai import CrewAIAgent

from research.crew import ResearchCrew

app = ReadyAPI()
sdk = NeoPilotRemoteEndpoint(
    agents=[
        CrewAIAgent(
            name="research_crew",
            description="Research agent",
            crew=ResearchCrew(),
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
    uvicorn.run(
        "research.demo:app",
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
