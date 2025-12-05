"""Demo"""

import os
# from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

# pylint: disable=wrong-import-position
# from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from readyapi import ReadyAPI
import uvicorn
from neopilot.integrations.readyapi import add_readyapi_endpoint
from neopilot import NeoPilotRemoteEndpoint, LangGraphAgent
from research_canvas.langgraph.agent import graph


# @asynccontextmanager
# async def lifespan(readyapi_app: ReadyAPI):
#     """Lifespan for the ReadyAPI app."""
#     async with AsyncSqliteSaver.from_conn_string(
#         "postgresql://postgres:postgres@127.0.0.1:5432/postgres"
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
        LangGraphAgent(
            name="research_agent",
            description="Research agent.",
            graph=graph,
        ),
        LangGraphAgent(
            name="research_agent_google_genai",
            description="Research agent.",
            graph=graph
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
        "research_canvas.langgraph.demo:app",
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
