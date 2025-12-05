"""Demo"""

import os
from dotenv import load_dotenv 
load_dotenv()

# pylint: disable=wrong-import-position
from readyapi import ReadyAPI
import uvicorn
from neopilot.integrations.readyapi import add_readyapi_endpoint
from neopilot import NeoPilotSDK, LangGraphAgent
from tutorial_customer_support.agent import part_1_graph

app = ReadyAPI()
sdk = NeoPilotSDK(
    agents=[
        LangGraphAgent(
            name="customer_support_agent",
            description="Customer support agent.",
            graph=part_1_graph,
            config={
                "configurable": {
                    # The passenger_id is used in our flight tools to
                    # fetch the user's flight information
                    "passenger_id": "3442 587242",                
                }
            }
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
    uvicorn.run("tutorial_customer_support.demo:app", host="0.0.0.0", port=port)
