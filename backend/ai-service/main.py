"""
NeoAI IDE - AI Service
Handles AI model orchestration, prompt engineering, and intelligent code assistance.
"""

import os
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
import redis.asyncio as redis
import openai
import anthropic
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Metrics
REQUEST_COUNT = Counter('ai_requests_total', 'Total AI requests', ['model', 'endpoint'])
REQUEST_DURATION = Histogram('ai_request_duration_seconds', 'AI request duration', ['model'])
TOKEN_USAGE = Counter('ai_tokens_total', 'Total tokens used', ['model', 'type'])
COST_TRACKING = Counter('ai_cost_total', 'Total AI cost in USD', ['model'])

# Global variables
redis_client: Optional[redis.Redis] = None
openai_client: Optional[openai.AsyncOpenAI] = None
anthropic_client: Optional[anthropic.AsyncAnthropic] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global redis_client, openai_client, anthropic_client
    
    # Startup
    logger.info("Starting AI Service...")
    
    # Initialize Redis
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
    redis_client = redis.from_url(redis_url, decode_responses=True)
    
    # Initialize AI clients
    if os.getenv('OPENAI_API_KEY'):
        openai_client = openai.AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        logger.info("OpenAI client initialized")
    
    if os.getenv('ANTHROPIC_API_KEY'):
        anthropic_client = anthropic.AsyncAnthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        logger.info("Anthropic client initialized")
    
    logger.info("AI Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Service...")
    if redis_client:
        await redis_client.close()
    logger.info("AI Service shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="NeoAI IDE - AI Service",
    description="AI model orchestration and intelligent code assistance",
    version="1.0.0",
    lifespan=lifespan
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Pydantic models
class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: user, assistant, or system")
    content: str = Field(..., description="Message content")

class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="Chat messages")
    model: str = Field(default="gpt-3.5-turbo", description="AI model to use")
    max_tokens: Optional[int] = Field(default=2048, description="Maximum tokens to generate")
    temperature: Optional[float] = Field(default=0.7, description="Temperature for randomness")
    stream: Optional[bool] = Field(default=False, description="Stream response")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")

class CompletionRequest(BaseModel):
    prompt: str = Field(..., description="Code completion prompt")
    language: str = Field(..., description="Programming language")
    model: str = Field(default="gpt-3.5-turbo", description="AI model to use")
    max_tokens: Optional[int] = Field(default=512, description="Maximum tokens to generate")
    context: Optional[str] = Field(default=None, description="Code context")

class CodeAnalysisRequest(BaseModel):
    code: str = Field(..., description="Code to analyze")
    language: str = Field(..., description="Programming language")
    analysis_type: str = Field(..., description="Type of analysis: explain, refactor, optimize, debug")
    model: str = Field(default="gpt-4", description="AI model to use")

class AIResponse(BaseModel):
    content: str = Field(..., description="AI response content")
    model: str = Field(..., description="Model used")
    tokens: Dict[str, int] = Field(..., description="Token usage")
    cost: float = Field(..., description="Request cost in USD")
    cached: bool = Field(default=False, description="Whether response was cached")

# Model configurations
MODEL_CONFIGS = {
    "gpt-3.5-turbo": {
        "provider": "openai",
        "input_cost": 0.001,  # per 1K tokens
        "output_cost": 0.002,
        "context_length": 16385,
        "capabilities": ["chat", "completion", "code"]
    },
    "gpt-4": {
        "provider": "openai",
        "input_cost": 0.01,
        "output_cost": 0.03,
        "context_length": 8192,
        "capabilities": ["chat", "completion", "code", "analysis"]
    },
    "gpt-4-turbo": {
        "provider": "openai",
        "input_cost": 0.01,
        "output_cost": 0.03,
        "context_length": 128000,
        "capabilities": ["chat", "completion", "code", "analysis"]
    },
    "claude-3-haiku": {
        "provider": "anthropic",
        "input_cost": 0.00025,
        "output_cost": 0.00125,
        "context_length": 200000,
        "capabilities": ["chat", "completion", "code"]
    },
    "claude-3-sonnet": {
        "provider": "anthropic",
        "input_cost": 0.003,
        "output_cost": 0.015,
        "context_length": 200000,
        "capabilities": ["chat", "completion", "code", "analysis"]
    },
    "claude-3-opus": {
        "provider": "anthropic",
        "input_cost": 0.015,
        "output_cost": 0.075,
        "context_length": 200000,
        "capabilities": ["chat", "completion", "code", "analysis", "reasoning"]
    }
}

# Utility functions
def count_tokens(text: str) -> int:
    """Estimate token count (rough approximation)"""
    return len(text) // 4

def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost for AI request"""
    config = MODEL_CONFIGS.get(model, {})
    input_cost = config.get("input_cost", 0) * (input_tokens / 1000)
    output_cost = config.get("output_cost", 0) * (output_tokens / 1000)
    return input_cost + output_cost

async def get_cached_response(cache_key: str) -> Optional[Dict]:
    """Get cached response from Redis"""
    if not redis_client:
        return None
    
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            import json
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Cache retrieval error: {e}")
    
    return None

async def cache_response(cache_key: str, response: Dict, ttl: int = 3600):
    """Cache response in Redis"""
    if not redis_client:
        return
    
    try:
        import json
        await redis_client.setex(cache_key, ttl, json.dumps(response))
    except Exception as e:
        logger.warning(f"Cache storage error: {e}")

async def call_openai(messages: List[Dict], model: str, **kwargs) -> Dict:
    """Call OpenAI API"""
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI client not available")
    
    try:
        response = await openai_client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )
        
        return {
            "content": response.choices[0].message.content,
            "tokens": {
                "input": response.usage.prompt_tokens,
                "output": response.usage.completion_tokens,
                "total": response.usage.total_tokens
            }
        }
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

async def call_anthropic(messages: List[Dict], model: str, **kwargs) -> Dict:
    """Call Anthropic API"""
    if not anthropic_client:
        raise HTTPException(status_code=503, detail="Anthropic client not available")
    
    try:
        # Convert messages format for Anthropic
        system_message = ""
        anthropic_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_message = msg["content"]
            else:
                anthropic_messages.append(msg)
        
        response = await anthropic_client.messages.create(
            model=model,
            messages=anthropic_messages,
            system=system_message if system_message else None,
            max_tokens=kwargs.get("max_tokens", 2048),
            temperature=kwargs.get("temperature", 0.7)
        )
        
        return {
            "content": response.content[0].text,
            "tokens": {
                "input": response.usage.input_tokens,
                "output": response.usage.output_tokens,
                "total": response.usage.input_tokens + response.usage.output_tokens
            }
        }
    except Exception as e:
        logger.error(f"Anthropic API error: {e}")
        raise HTTPException(status_code=500, detail=f"Anthropic API error: {str(e)}")

# API Routes
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ai-service",
        "version": "1.0.0"
    }

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/ai/models")
async def list_models():
    """List available AI models"""
    return {
        "models": MODEL_CONFIGS,
        "default": "gpt-3.5-turbo"
    }

@app.post("/ai/chat", response_model=AIResponse)
async def chat_completion(request: ChatRequest, background_tasks: BackgroundTasks):
    """Generate chat completion"""
    start_time = datetime.utcnow()
    
    # Validate model
    if request.model not in MODEL_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Model {request.model} not supported")
    
    # Create cache key
    import hashlib
    cache_key = f"chat:{hashlib.md5(str(request.dict()).encode()).hexdigest()}"
    
    # Check cache
    cached_response = await get_cached_response(cache_key)
    if cached_response:
        REQUEST_COUNT.labels(model=request.model, endpoint="chat").inc()
        return AIResponse(**cached_response, cached=True)
    
    # Prepare messages
    messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    # Call appropriate provider
    config = MODEL_CONFIGS[request.model]
    provider = config["provider"]
    
    if provider == "openai":
        result = await call_openai(
            messages=messages,
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
    elif provider == "anthropic":
        result = await call_anthropic(
            messages=messages,
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
    else:
        raise HTTPException(status_code=500, detail=f"Provider {provider} not implemented")
    
    # Calculate cost
    cost = calculate_cost(
        request.model,
        result["tokens"]["input"],
        result["tokens"]["output"]
    )
    
    # Create response
    response = AIResponse(
        content=result["content"],
        model=request.model,
        tokens=result["tokens"],
        cost=cost,
        cached=False
    )
    
    # Cache response
    background_tasks.add_task(
        cache_response,
        cache_key,
        response.dict(exclude={"cached"}),
        3600  # 1 hour TTL
    )
    
    # Update metrics
    REQUEST_COUNT.labels(model=request.model, endpoint="chat").inc()
    REQUEST_DURATION.labels(model=request.model).observe(
        (datetime.utcnow() - start_time).total_seconds()
    )
    TOKEN_USAGE.labels(model=request.model, type="input").inc(result["tokens"]["input"])
    TOKEN_USAGE.labels(model=request.model, type="output").inc(result["tokens"]["output"])
    COST_TRACKING.labels(model=request.model).inc(cost)
    
    return response

@app.post("/ai/completion", response_model=AIResponse)
async def code_completion(request: CompletionRequest, background_tasks: BackgroundTasks):
    """Generate code completion"""
    # Create system prompt for code completion
    system_prompt = f"""You are an expert {request.language} programmer. 
    Provide code completion for the given prompt. 
    Return only the code without explanations unless specifically asked.
    Ensure the code is syntactically correct and follows best practices."""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Complete this {request.language} code:\n\n{request.prompt}"}
    ]
    
    if request.context:
        messages.insert(1, {
            "role": "user", 
            "content": f"Context:\n{request.context}\n\nNow complete:"
        })
    
    # Use chat completion with code-specific prompt
    chat_request = ChatRequest(
        messages=[ChatMessage(**msg) for msg in messages],
        model=request.model,
        max_tokens=request.max_tokens,
        temperature=0.2  # Lower temperature for code completion
    )
    
    return await chat_completion(chat_request, background_tasks)

@app.post("/ai/analyze", response_model=AIResponse)
async def analyze_code(request: CodeAnalysisRequest, background_tasks: BackgroundTasks):
    """Analyze code (explain, refactor, optimize, debug)"""
    analysis_prompts = {
        "explain": f"Explain this {request.language} code in detail:",
        "refactor": f"Refactor this {request.language} code to improve readability and maintainability:",
        "optimize": f"Optimize this {request.language} code for better performance:",
        "debug": f"Debug this {request.language} code and identify potential issues:",
        "test": f"Generate comprehensive unit tests for this {request.language} code:",
        "document": f"Add comprehensive documentation and comments to this {request.language} code:"
    }
    
    if request.analysis_type not in analysis_prompts:
        raise HTTPException(
            status_code=400, 
            detail=f"Analysis type must be one of: {list(analysis_prompts.keys())}"
        )
    
    prompt = analysis_prompts[request.analysis_type]
    messages = [
        {"role": "system", "content": f"You are an expert {request.language} programmer and code reviewer."},
        {"role": "user", "content": f"{prompt}\n\n```{request.language}\n{request.code}\n```"}
    ]
    
    chat_request = ChatRequest(
        messages=[ChatMessage(**msg) for msg in messages],
        model=request.model,
        max_tokens=2048,
        temperature=0.3
    )
    
    return await chat_completion(chat_request, background_tasks)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8003)),
        reload=os.getenv("NODE_ENV") == "development"
    )
