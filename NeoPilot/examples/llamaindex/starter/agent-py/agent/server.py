from readyapi import ReadyAPI
from .agent import agentic_chat_router

app = ReadyAPI()
app.include_router(agentic_chat_router)
