"""
NeoAI IDE - Agent Service
Advanced autonomous development agents with multi-step workflows and intelligent automation.
"""

import os
import asyncio
import logging
import json
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
import redis.asyncio as redis
import httpx
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Metrics
AGENT_REQUESTS = Counter('agent_requests_total', 'Total agent requests', ['agent_type', 'status'])
AGENT_DURATION = Histogram('agent_duration_seconds', 'Agent execution duration', ['agent_type'])
AGENT_STEPS = Counter('agent_steps_total', 'Total agent steps executed', ['agent_type', 'step_type'])

# Global variables
redis_client: Optional[redis.Redis] = None
ai_service_client: Optional[httpx.AsyncClient] = None
project_service_client: Optional[httpx.AsyncClient] = None

# WebSocket connections
active_connections: Dict[str, WebSocket] = {}

class AgentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"

class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class AgentType(str, Enum):
    CODE_GENERATOR = "code_generator"
    FEATURE_IMPLEMENTER = "feature_implementer"
    BUG_FIXER = "bug_fixer"
    REFACTORER = "refactorer"
    TEST_GENERATOR = "test_generator"
    DOCUMENTATION_WRITER = "documentation_writer"
    DEPLOYMENT_MANAGER = "deployment_manager"
    CODE_REVIEWER = "code_reviewer"

class AgentStep(BaseModel):
    id: str = Field(..., description="Unique step identifier")
    name: str = Field(..., description="Step name")
    description: str = Field(..., description="Step description")
    type: str = Field(..., description="Step type")
    status: StepStatus = Field(default=StepStatus.PENDING, description="Step status")
    input_data: Dict[str, Any] = Field(default_factory=dict, description="Step input data")
    output_data: Dict[str, Any] = Field(default_factory=dict, description="Step output data")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    started_at: Optional[datetime] = Field(default=None, description="Step start time")
    completed_at: Optional[datetime] = Field(default=None, description="Step completion time")
    duration: Optional[float] = Field(default=None, description="Step duration in seconds")
    dependencies: List[str] = Field(default_factory=list, description="Step dependencies")
    retry_count: int = Field(default=0, description="Number of retries")
    max_retries: int = Field(default=3, description="Maximum retry attempts")

class AgentTask(BaseModel):
    id: str = Field(..., description="Unique task identifier")
    project_id: str = Field(..., description="Project identifier")
    user_id: str = Field(..., description="User identifier")
    agent_type: AgentType = Field(..., description="Type of agent")
    title: str = Field(..., description="Task title")
    description: str = Field(..., description="Task description")
    status: AgentStatus = Field(default=AgentStatus.PENDING, description="Task status")
    progress: float = Field(default=0.0, description="Task progress (0-100)")
    steps: List[AgentStep] = Field(default_factory=list, description="Task steps")
    context: Dict[str, Any] = Field(default_factory=dict, description="Task context")
    config: Dict[str, Any] = Field(default_factory=dict, description="Agent configuration")
    result: Dict[str, Any] = Field(default_factory=dict, description="Task result")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Task creation time")
    started_at: Optional[datetime] = Field(default=None, description="Task start time")
    completed_at: Optional[datetime] = Field(default=None, description="Task completion time")
    duration: Optional[float] = Field(default=None, description="Task duration in seconds")

class CreateAgentTaskRequest(BaseModel):
    project_id: str = Field(..., description="Project identifier")
    agent_type: AgentType = Field(..., description="Type of agent")
    title: str = Field(..., description="Task title")
    description: str = Field(..., description="Task description")
    context: Dict[str, Any] = Field(default_factory=dict, description="Task context")
    config: Dict[str, Any] = Field(default_factory=dict, description="Agent configuration")

class AgentResponse(BaseModel):
    task: AgentTask = Field(..., description="Agent task")
    message: str = Field(..., description="Response message")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global redis_client, ai_service_client, project_service_client
    
    # Startup
    logger.info("Starting Agent Service...")
    
    # Initialize Redis
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
    redis_client = redis.from_url(redis_url, decode_responses=True)
    
    # Initialize HTTP clients
    ai_service_url = os.getenv('AI_SERVICE_URL', 'http://localhost:8003')
    project_service_url = os.getenv('PROJECT_SERVICE_URL', 'http://localhost:8002')
    
    ai_service_client = httpx.AsyncClient(base_url=ai_service_url)
    project_service_client = httpx.AsyncClient(base_url=project_service_url)
    
    logger.info("Agent Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Agent Service...")
    if redis_client:
        await redis_client.close()
    if ai_service_client:
        await ai_service_client.aclose()
    if project_service_client:
        await project_service_client.aclose()
    logger.info("Agent Service shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="NeoAI IDE - Agent Service",
    description="Advanced autonomous development agents with multi-step workflows",
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

# Agent implementations
class BaseAgent:
    """Base class for all agents"""
    
    def __init__(self, task: AgentTask):
        self.task = task
        self.current_step_index = 0
    
    async def execute(self) -> AgentTask:
        """Execute the agent task"""
        try:
            self.task.status = AgentStatus.RUNNING
            self.task.started_at = datetime.utcnow()
            await self.save_task()
            
            # Generate execution plan
            await self.generate_plan()
            
            # Execute steps
            for i, step in enumerate(self.task.steps):
                self.current_step_index = i
                await self.execute_step(step)
                
                # Update progress
                self.task.progress = ((i + 1) / len(self.task.steps)) * 100
                await self.save_task()
                
                # Check if task was cancelled
                if self.task.status == AgentStatus.CANCELLED:
                    break
            
            # Finalize task
            if self.task.status == AgentStatus.RUNNING:
                self.task.status = AgentStatus.COMPLETED
                await self.finalize_task()
            
            self.task.completed_at = datetime.utcnow()
            if self.task.started_at:
                self.task.duration = (self.task.completed_at - self.task.started_at).total_seconds()
            
            await self.save_task()
            return self.task
            
        except Exception as e:
            logger.error(f"Agent execution failed: {e}")
            self.task.status = AgentStatus.FAILED
            self.task.error_message = str(e)
            self.task.completed_at = datetime.utcnow()
            if self.task.started_at:
                self.task.duration = (self.task.completed_at - self.task.started_at).total_seconds()
            await self.save_task()
            raise
    
    async def generate_plan(self):
        """Generate execution plan - to be implemented by subclasses"""
        raise NotImplementedError
    
    async def execute_step(self, step: AgentStep):
        """Execute a single step"""
        try:
            step.status = StepStatus.RUNNING
            step.started_at = datetime.utcnow()
            await self.save_task()
            await self.broadcast_update()
            
            # Execute step logic
            await self.execute_step_logic(step)
            
            step.status = StepStatus.COMPLETED
            step.completed_at = datetime.utcnow()
            if step.started_at:
                step.duration = (step.completed_at - step.started_at).total_seconds()
            
            await self.save_task()
            await self.broadcast_update()
            
        except Exception as e:
            logger.error(f"Step execution failed: {e}")
            step.status = StepStatus.FAILED
            step.error_message = str(e)
            step.completed_at = datetime.utcnow()
            if step.started_at:
                step.duration = (step.completed_at - step.started_at).total_seconds()
            
            # Retry logic
            if step.retry_count < step.max_retries:
                step.retry_count += 1
                step.status = StepStatus.PENDING
                step.error_message = None
                logger.info(f"Retrying step {step.id} (attempt {step.retry_count})")
                await asyncio.sleep(2 ** step.retry_count)  # Exponential backoff
                await self.execute_step(step)
            else:
                self.task.status = AgentStatus.FAILED
                self.task.error_message = f"Step {step.name} failed: {str(e)}"
                await self.save_task()
                await self.broadcast_update()
                raise
    
    async def execute_step_logic(self, step: AgentStep):
        """Execute step-specific logic - to be implemented by subclasses"""
        raise NotImplementedError
    
    async def finalize_task(self):
        """Finalize task execution - to be implemented by subclasses"""
        pass
    
    async def save_task(self):
        """Save task to Redis"""
        if redis_client:
            await redis_client.setex(
                f"agent_task:{self.task.id}",
                3600,  # 1 hour TTL
                self.task.json()
            )
    
    async def broadcast_update(self):
        """Broadcast task update via WebSocket"""
        if self.task.project_id in active_connections:
            try:
                await active_connections[self.task.project_id].send_text(
                    json.dumps({
                        "type": "agent_update",
                        "task": self.task.dict(),
                        "timestamp": datetime.utcnow().isoformat()
                    })
                )
            except Exception as e:
                logger.error(f"Failed to broadcast update: {e}")
    
    async def call_ai_service(self, prompt: str, model: str = "gpt-4") -> str:
        """Call AI service for code generation"""
        try:
            response = await ai_service_client.post(
                "/ai/chat",
                json={
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "model": model,
                    "max_tokens": 2048
                }
            )
            response.raise_for_status()
            data = response.json()
            return data["content"]
        except Exception as e:
            logger.error(f"AI service call failed: {e}")
            raise
    
    async def get_project_files(self, project_id: str) -> List[Dict]:
        """Get project files from project service"""
        try:
            response = await project_service_client.get(f"/projects/{project_id}")
            response.raise_for_status()
            data = response.json()
            return data["project"]["files"]
        except Exception as e:
            logger.error(f"Failed to get project files: {e}")
            raise
    
    async def create_file(self, project_id: str, file_path: str, content: str):
        """Create a file in the project"""
        try:
            response = await project_service_client.post(
                f"/files",
                json={
                    "projectId": project_id,
                    "path": file_path,
                    "content": content
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to create file: {e}")
            raise
    
    async def update_file(self, project_id: str, file_path: str, content: str):
        """Update a file in the project"""
        try:
            response = await project_service_client.put(
                f"/files",
                json={
                    "projectId": project_id,
                    "path": file_path,
                    "content": content
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to update file: {e}")
            raise

class FeatureImplementerAgent(BaseAgent):
    """Agent for implementing complete features"""
    
    async def generate_plan(self):
        """Generate implementation plan"""
        feature_description = self.task.description
        project_files = await self.get_project_files(self.task.project_id)
        
        # Analyze project structure
        analysis_prompt = f"""
        Analyze this project structure and create a detailed implementation plan for the feature: "{feature_description}"

        Project files:
        {json.dumps([f["path"] for f in project_files], indent=2)}

        Create a step-by-step plan that includes:
        1. Analysis of existing code
        2. Design decisions
        3. File modifications/creations needed
        4. Implementation steps
        5. Testing approach
        6. Documentation updates

        Return the plan as a JSON array of steps with: name, description, type, dependencies.
        """
        
        plan_response = await self.call_ai_service(analysis_prompt)
        
        try:
            plan_data = json.loads(plan_response)
            self.task.steps = [
                AgentStep(
                    id=f"step_{i}",
                    name=step["name"],
                    description=step["description"],
                    type=step["type"],
                    dependencies=step.get("dependencies", [])
                )
                for i, step in enumerate(plan_data)
            ]
        except Exception as e:
            logger.error(f"Failed to parse plan: {e}")
            # Fallback to default plan
            self.task.steps = [
                AgentStep(
                    id="step_0",
                    name="Analyze Requirements",
                    description="Analyze feature requirements and existing codebase",
                    type="analysis"
                ),
                AgentStep(
                    id="step_1",
                    name="Design Implementation",
                    description="Design the implementation approach",
                    type="design"
                ),
                AgentStep(
                    id="step_2",
                    name="Implement Feature",
                    description="Implement the feature code",
                    type="implementation"
                ),
                AgentStep(
                    id="step_3",
                    name="Generate Tests",
                    description="Generate unit tests for the feature",
                    type="testing"
                ),
                AgentStep(
                    id="step_4",
                    name="Update Documentation",
                    description="Update relevant documentation",
                    type="documentation"
                )
            ]
    
    async def execute_step_logic(self, step: AgentStep):
        """Execute step-specific logic"""
        if step.type == "analysis":
            await self.analyze_requirements(step)
        elif step.type == "design":
            await self.design_implementation(step)
        elif step.type == "implementation":
            await self.implement_feature(step)
        elif step.type == "testing":
            await self.generate_tests(step)
        elif step.type == "documentation":
            await self.update_documentation(step)
        else:
            logger.warning(f"Unknown step type: {step.type}")
    
    async def analyze_requirements(self, step: AgentStep):
        """Analyze feature requirements"""
        project_files = await self.get_project_files(self.task.project_id)
        
        analysis_prompt = f"""
        Analyze the requirements for implementing: "{self.task.description}"
        
        Consider the existing project structure and identify:
        1. Required dependencies
        2. Affected files
        3. New files needed
        4. Integration points
        5. Potential challenges
        
        Project structure: {[f["path"] for f in project_files]}
        """
        
        analysis = await self.call_ai_service(analysis_prompt)
        step.output_data = {"analysis": analysis}
    
    async def design_implementation(self, step: AgentStep):
        """Design the implementation approach"""
        analysis = self.task.steps[0].output_data.get("analysis", "")
        
        design_prompt = f"""
        Based on this analysis: {analysis}
        
        Design a detailed implementation for: "{self.task.description}"
        
        Include:
        1. Architecture decisions
        2. File structure changes
        3. API design (if applicable)
        4. Data flow
        5. Error handling approach
        """
        
        design = await self.call_ai_service(design_prompt)
        step.output_data = {"design": design}
    
    async def implement_feature(self, step: AgentStep):
        """Implement the actual feature"""
        design = self.task.steps[1].output_data.get("design", "")
        project_files = await self.get_project_files(self.task.project_id)
        
        # Get existing file contents for context
        file_contents = {}
        for file_info in project_files[:10]:  # Limit to first 10 files for context
            if file_info.get("content"):
                file_contents[file_info["path"]] = file_info["content"]
        
        implementation_prompt = f"""
        Implement the feature: "{self.task.description}"
        
        Design: {design}
        
        Existing files context:
        {json.dumps(file_contents, indent=2)}
        
        Generate the complete implementation including:
        1. New files to create
        2. Existing files to modify
        3. Complete code for each file
        
        Return as JSON with format:
        {{
            "new_files": [
                {{"path": "file/path", "content": "file content"}},
                ...
            ],
            "modified_files": [
                {{"path": "file/path", "content": "updated content"}},
                ...
            ]
        }}
        """
        
        implementation = await self.call_ai_service(implementation_prompt, model="gpt-4")
        
        try:
            impl_data = json.loads(implementation)
            
            # Create new files
            for file_data in impl_data.get("new_files", []):
                await self.create_file(
                    self.task.project_id,
                    file_data["path"],
                    file_data["content"]
                )
            
            # Update existing files
            for file_data in impl_data.get("modified_files", []):
                await self.update_file(
                    self.task.project_id,
                    file_data["path"],
                    file_data["content"]
                )
            
            step.output_data = {
                "files_created": len(impl_data.get("new_files", [])),
                "files_modified": len(impl_data.get("modified_files", [])),
                "implementation": impl_data
            }
            
        except Exception as e:
            logger.error(f"Failed to parse implementation: {e}")
            step.output_data = {"error": str(e), "raw_response": implementation}
    
    async def generate_tests(self, step: AgentStep):
        """Generate unit tests for the feature"""
        implementation = self.task.steps[2].output_data.get("implementation", {})
        
        test_prompt = f"""
        Generate comprehensive unit tests for the implemented feature: "{self.task.description}"
        
        Implementation details: {json.dumps(implementation, indent=2)}
        
        Create test files that cover:
        1. Happy path scenarios
        2. Edge cases
        3. Error conditions
        4. Integration points
        
        Return as JSON with test files:
        {{
            "test_files": [
                {{"path": "test/file/path", "content": "test content"}},
                ...
            ]
        }}
        """
        
        tests = await self.call_ai_service(test_prompt)
        
        try:
            test_data = json.loads(tests)
            
            # Create test files
            for test_file in test_data.get("test_files", []):
                await self.create_file(
                    self.task.project_id,
                    test_file["path"],
                    test_file["content"]
                )
            
            step.output_data = {
                "test_files_created": len(test_data.get("test_files", [])),
                "tests": test_data
            }
            
        except Exception as e:
            logger.error(f"Failed to parse tests: {e}")
            step.output_data = {"error": str(e), "raw_response": tests}
    
    async def update_documentation(self, step: AgentStep):
        """Update project documentation"""
        implementation = self.task.steps[2].output_data.get("implementation", {})
        
        doc_prompt = f"""
        Update documentation for the new feature: "{self.task.description}"
        
        Implementation: {json.dumps(implementation, indent=2)}
        
        Generate documentation updates including:
        1. README updates
        2. API documentation
        3. Usage examples
        4. Configuration notes
        
        Return as JSON with documentation files:
        {{
            "doc_files": [
                {{"path": "doc/file/path", "content": "doc content"}},
                ...
            ]
        }}
        """
        
        docs = await self.call_ai_service(doc_prompt)
        
        try:
            doc_data = json.loads(docs)
            
            # Update documentation files
            for doc_file in doc_data.get("doc_files", []):
                await self.update_file(
                    self.task.project_id,
                    doc_file["path"],
                    doc_file["content"]
                )
            
            step.output_data = {
                "doc_files_updated": len(doc_data.get("doc_files", [])),
                "documentation": doc_data
            }
            
        except Exception as e:
            logger.error(f"Failed to parse documentation: {e}")
            step.output_data = {"error": str(e), "raw_response": docs}
    
    async def finalize_task(self):
        """Finalize the feature implementation"""
        # Collect results from all steps
        files_created = sum(step.output_data.get("files_created", 0) for step in self.task.steps)
        files_modified = sum(step.output_data.get("files_modified", 0) for step in self.task.steps)
        test_files_created = sum(step.output_data.get("test_files_created", 0) for step in self.task.steps)
        doc_files_updated = sum(step.output_data.get("doc_files_updated", 0) for step in self.task.steps)
        
        self.task.result = {
            "feature_implemented": True,
            "files_created": files_created,
            "files_modified": files_modified,
            "test_files_created": test_files_created,
            "doc_files_updated": doc_files_updated,
            "summary": f"Successfully implemented feature: {self.task.description}",
            "next_steps": [
                "Review generated code",
                "Run tests to verify functionality",
                "Test the feature manually",
                "Deploy to staging environment"
            ]
        }

# Agent factory
def create_agent(task: AgentTask) -> BaseAgent:
    """Create appropriate agent based on task type"""
    if task.agent_type == AgentType.FEATURE_IMPLEMENTER:
        return FeatureImplementerAgent(task)
    # Add other agent types here
    else:
        raise ValueError(f"Unknown agent type: {task.agent_type}")

# API Routes
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "agent-service",
        "version": "1.0.0"
    }

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/agents/tasks", response_model=AgentResponse)
async def create_agent_task(request: CreateAgentTaskRequest, background_tasks: BackgroundTasks):
    """Create and start a new agent task"""
    import uuid
    
    task = AgentTask(
        id=str(uuid.uuid4()),
        project_id=request.project_id,
        user_id="current-user",  # TODO: Get from auth
        agent_type=request.agent_type,
        title=request.title,
        description=request.description,
        context=request.context,
        config=request.config
    )
    
    # Save task to Redis
    if redis_client:
        await redis_client.setex(
            f"agent_task:{task.id}",
            3600,  # 1 hour TTL
            task.json()
        )
    
    # Start agent execution in background
    background_tasks.add_task(execute_agent_task, task)
    
    # Update metrics
    AGENT_REQUESTS.labels(agent_type=task.agent_type.value, status="created").inc()
    
    return AgentResponse(
        task=task,
        message="Agent task created and started successfully"
    )

@app.get("/agents/tasks/{task_id}")
async def get_agent_task(task_id: str):
    """Get agent task status"""
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis not available")
    
    task_data = await redis_client.get(f"agent_task:{task_id}")
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = AgentTask.parse_raw(task_data)
    return {"task": task}

@app.post("/agents/tasks/{task_id}/cancel")
async def cancel_agent_task(task_id: str):
    """Cancel a running agent task"""
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis not available")
    
    task_data = await redis_client.get(f"agent_task:{task_id}")
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = AgentTask.parse_raw(task_data)
    
    if task.status in [AgentStatus.COMPLETED, AgentStatus.FAILED, AgentStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Task cannot be cancelled")
    
    task.status = AgentStatus.CANCELLED
    await redis_client.setex(f"agent_task:{task_id}", 3600, task.json())
    
    return {"message": "Task cancelled successfully", "task": task}

@app.websocket("/agents/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    """WebSocket endpoint for real-time agent updates"""
    await websocket.accept()
    active_connections[project_id] = websocket
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        if project_id in active_connections:
            del active_connections[project_id]

async def execute_agent_task(task: AgentTask):
    """Execute agent task in background"""
    start_time = datetime.utcnow()
    
    try:
        agent = create_agent(task)
        await agent.execute()
        
        AGENT_REQUESTS.labels(agent_type=task.agent_type.value, status="completed").inc()
        
    except Exception as e:
        logger.error(f"Agent task execution failed: {e}")
        AGENT_REQUESTS.labels(agent_type=task.agent_type.value, status="failed").inc()
    
    finally:
        duration = (datetime.utcnow() - start_time).total_seconds()
        AGENT_DURATION.labels(agent_type=task.agent_type.value).observe(duration)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8004)),
        reload=os.getenv("NODE_ENV") == "development"
    )
