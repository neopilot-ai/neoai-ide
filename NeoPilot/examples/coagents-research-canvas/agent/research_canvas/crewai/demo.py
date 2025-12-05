"""Demo"""

import os
from dotenv import load_dotenv
load_dotenv()

# pylint: disable=wrong-import-position
from readyapi import ReadyAPI
import uvicorn
from neopilot.integrations.readyapi import add_readyapi_endpoint
from neopilot import NeoPilotRemoteEndpoint, CrewAIAgent
from research_canvas.crewai.agent import ResearchCanvasFlow

app = ReadyAPI()
sdk = NeoPilotRemoteEndpoint(
    agents=[
        CrewAIAgent(
            name="research_agent_crewai",
            description="Research agent using CrewAI.",
            flow=ResearchCanvasFlow(),
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
        "research_canvas.crewai.demo:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        reload_dirs=(
            ["."] +
            (["../../../../sdk-python/neopilot"]
             if os.path.exists("../../../../sdk-python/neopilot")
             else []
             )
        )
    )
