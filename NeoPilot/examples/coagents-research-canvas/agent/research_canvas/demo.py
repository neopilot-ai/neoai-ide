"""Demo"""

import os
from dotenv import load_dotenv
load_dotenv()

# pylint: disable=wrong-import-position
from readyapi import ReadyAPI
import uvicorn
from neopilot.integrations.readyapi import add_readyapi_endpoint
from neopilot import NeoPilotRemoteEndpoint, LangGraphAGUIAgent
from neopilot.crewai import CrewAIAgent
from research_canvas.crewai.agent import ResearchCanvasFlow
from research_canvas.langgraph.agent import graph
from ag_ui_langgraph import add_langgraph_readyapi_endpoint

# from contextlib import asynccontextmanager
# from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
# @asynccontextmanager
# async def lifespan(readyapi_app: ReadyAPI):
#     """Lifespan for the ReadyAPI app."""
#     async with AsyncSqliteSaver.from_conn_string(
#         ":memory:"
#     ) as checkpointer:
#         # Create an async graph
#         graph = workflow.compile(checkpointer=checkpointer)

#         # Create SDK with the graph
#         sdk = NeoPilotRemoteEndpoint(
#             agents=[
#                 LangGraphAgent(
#                     name="research_agent",
#                     description="Research agent.",
#                     graph=graph,
#                 ),
#                 LangGraphAgent(
#                     name="research_agent_google_genai",
#                     description="Research agent.",
#                     graph=graph
#                 ),
#             ],
#         )

#         # Add the NeoPilot ReadyAPI endpoint
#         add_readyapi_endpoint(readyapi_app, sdk, "/neopilot")
#         yield

# app = ReadyAPI(lifespan=lifespan)


app = ReadyAPI()
sdk = NeoPilotRemoteEndpoint(
    agents=[
        CrewAIAgent(
            name="research_agent_crewai",
            description="Research agent.",
            flow=ResearchCanvasFlow(),
        ),
    ],
)

add_langgraph_readyapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="research_agent",
        description="Research agent.",
        graph=graph
    ),
    path="/neopilot/agents/research_agent"
)
add_langgraph_readyapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="research_agent_google_genai",
        description="Research agent.",
        graph=graph
    ),
    path="/neopilot/agents/research_agent_google_genai"
)

add_readyapi_endpoint(app, sdk, "/neopilot")


@app.get("/health")
def health():
    """Health check."""
    return {"status": "ok"}


def main():
    """Run the uvicorn server."""
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "research_canvas.demo:app",
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
