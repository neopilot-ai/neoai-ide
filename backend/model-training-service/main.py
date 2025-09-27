"""
NeoAI IDE - Model Training Service
Custom AI model training and fine-tuning service with distributed training capabilities.
"""

import os
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
import redis.asyncio as redis
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response
import structlog

# ML/AI imports
import torch
import transformers
from transformers import (
    AutoTokenizer, AutoModelForCausalLM, AutoModelForSequenceClassification,
    TrainingArguments, Trainer, DataCollatorForLanguageModeling
)
from datasets import Dataset, load_dataset
from peft import LoraConfig, get_peft_model, TaskType
import wandb

# Services
from services.training_manager import TrainingManager
from services.model_manager import ModelManager
from services.data_manager import DataManager
from services.evaluation_manager import EvaluationManager
from services.deployment_manager import DeploymentManager

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

# Metrics
TRAINING_REQUESTS = Counter('training_requests_total', 'Total training requests', ['model_type', 'status'])
TRAINING_DURATION = Histogram('training_duration_seconds', 'Training duration', ['model_type'])
MODEL_DEPLOYMENTS = Counter('model_deployments_total', 'Total model deployments', ['model_type', 'status'])

# Global variables
redis_client: Optional[redis.Redis] = None
training_manager: Optional[TrainingManager] = None
model_manager: Optional[ModelManager] = None
data_manager: Optional[DataManager] = None
evaluation_manager: Optional[EvaluationManager] = None
deployment_manager: Optional[DeploymentManager] = None

class ModelType(str, Enum):
    CODE_COMPLETION = "code_completion"
    CODE_GENERATION = "code_generation"
    CODE_EXPLANATION = "code_explanation"
    BUG_DETECTION = "bug_detection"
    CODE_REVIEW = "code_review"
    DOCUMENTATION = "documentation"
    CUSTOM = "custom"

class TrainingStatus(str, Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    TRAINING = "training"
    EVALUATING = "evaluating"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ModelFormat(str, Enum):
    PYTORCH = "pytorch"
    TENSORFLOW = "tensorflow"
    ONNX = "onnx"
    HUGGINGFACE = "huggingface"
    TENSORRT = "tensorrt"

class TrainingJob(BaseModel):
    id: str = Field(..., description="Unique job identifier")
    user_id: str = Field(..., description="User identifier")
    project_id: str = Field(..., description="Project identifier")
    name: str = Field(..., description="Job name")
    description: str = Field(..., description="Job description")
    model_type: ModelType = Field(..., description="Type of model to train")
    base_model: str = Field(..., description="Base model to fine-tune")
    dataset_id: str = Field(..., description="Training dataset identifier")
    config: "TrainingConfig" = Field(..., description="Training configuration")
    status: TrainingStatus = Field(default=TrainingStatus.PENDING, description="Current status")
    progress: float = Field(default=0.0, description="Training progress (0-100)")
    metrics: Dict[str, float] = Field(default_factory=dict, description="Training metrics")
    logs: List[str] = Field(default_factory=list, description="Training logs")
    artifacts: List["TrainingArtifact"] = Field(default_factory=list, description="Generated artifacts")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation time")
    started_at: Optional[datetime] = Field(default=None, description="Start time")
    completed_at: Optional[datetime] = Field(default=None, description="Completion time")
    estimated_duration: Optional[int] = Field(default=None, description="Estimated duration in seconds")

class TrainingConfig(BaseModel):
    # Model Configuration
    model_name: str = Field(..., description="Model name/identifier")
    model_architecture: str = Field(default="transformer", description="Model architecture")
    
    # Training Parameters
    learning_rate: float = Field(default=5e-5, description="Learning rate")
    batch_size: int = Field(default=8, description="Batch size")
    num_epochs: int = Field(default=3, description="Number of training epochs")
    warmup_steps: int = Field(default=500, description="Warmup steps")
    weight_decay: float = Field(default=0.01, description="Weight decay")
    gradient_accumulation_steps: int = Field(default=1, description="Gradient accumulation steps")
    max_grad_norm: float = Field(default=1.0, description="Maximum gradient norm")
    
    # LoRA Configuration (for efficient fine-tuning)
    use_lora: bool = Field(default=True, description="Use LoRA for efficient fine-tuning")
    lora_r: int = Field(default=16, description="LoRA rank")
    lora_alpha: int = Field(default=32, description="LoRA alpha")
    lora_dropout: float = Field(default=0.1, description="LoRA dropout")
    lora_target_modules: List[str] = Field(default_factory=lambda: ["q_proj", "v_proj"], description="LoRA target modules")
    
    # Data Configuration
    max_sequence_length: int = Field(default=512, description="Maximum sequence length")
    data_preprocessing: Dict[str, Any] = Field(default_factory=dict, description="Data preprocessing config")
    
    # Optimization
    optimizer: str = Field(default="adamw", description="Optimizer type")
    scheduler: str = Field(default="linear", description="Learning rate scheduler")
    fp16: bool = Field(default=True, description="Use mixed precision training")
    
    # Distributed Training
    distributed: bool = Field(default=False, description="Use distributed training")
    num_gpus: int = Field(default=1, description="Number of GPUs to use")
    deepspeed_config: Optional[Dict[str, Any]] = Field(default=None, description="DeepSpeed configuration")
    
    # Monitoring
    logging_steps: int = Field(default=10, description="Logging frequency")
    eval_steps: int = Field(default=500, description="Evaluation frequency")
    save_steps: int = Field(default=1000, description="Model save frequency")
    
    # Early Stopping
    early_stopping: bool = Field(default=True, description="Enable early stopping")
    early_stopping_patience: int = Field(default=3, description="Early stopping patience")
    early_stopping_threshold: float = Field(default=0.001, description="Early stopping threshold")

class TrainingArtifact(BaseModel):
    id: str = Field(..., description="Artifact identifier")
    type: str = Field(..., description="Artifact type")
    name: str = Field(..., description="Artifact name")
    path: str = Field(..., description="Storage path")
    size: int = Field(..., description="File size in bytes")
    format: ModelFormat = Field(..., description="File format")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation time")

class CreateTrainingJobRequest(BaseModel):
    name: str = Field(..., description="Job name")
    description: str = Field(..., description="Job description")
    model_type: ModelType = Field(..., description="Type of model to train")
    base_model: str = Field(..., description="Base model to fine-tune")
    dataset_id: str = Field(..., description="Training dataset identifier")
    config: TrainingConfig = Field(..., description="Training configuration")

class ModelDeployment(BaseModel):
    id: str = Field(..., description="Deployment identifier")
    model_id: str = Field(..., description="Model identifier")
    name: str = Field(..., description="Deployment name")
    endpoint_url: str = Field(..., description="Model endpoint URL")
    status: str = Field(..., description="Deployment status")
    config: Dict[str, Any] = Field(default_factory=dict, description="Deployment configuration")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation time")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global redis_client, training_manager, model_manager, data_manager, evaluation_manager, deployment_manager
    
    # Startup
    logger.info("Starting Model Training Service...")
    
    # Initialize Redis
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
    redis_client = redis.from_url(redis_url, decode_responses=True)
    
    # Initialize managers
    training_manager = TrainingManager(redis_client)
    model_manager = ModelManager(redis_client)
    data_manager = DataManager(redis_client)
    evaluation_manager = EvaluationManager(redis_client)
    deployment_manager = DeploymentManager(redis_client)
    
    # Initialize services
    await training_manager.initialize()
    await model_manager.initialize()
    await data_manager.initialize()
    await evaluation_manager.initialize()
    await deployment_manager.initialize()
    
    # Initialize Weights & Biases if API key is provided
    wandb_api_key = os.getenv('WANDB_API_KEY')
    if wandb_api_key:
        wandb.login(key=wandb_api_key)
        logger.info("Weights & Biases initialized")
    
    logger.info("Model Training Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Model Training Service...")
    
    if training_manager:
        await training_manager.cleanup()
    if model_manager:
        await model_manager.cleanup()
    if data_manager:
        await data_manager.cleanup()
    if evaluation_manager:
        await evaluation_manager.cleanup()
    if deployment_manager:
        await deployment_manager.cleanup()
    
    if redis_client:
        await redis_client.close()
    
    logger.info("Model Training Service shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="NeoAI IDE - Model Training Service",
    description="Custom AI model training and fine-tuning service",
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

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "model-training-service",
        "version": "1.0.0",
        "gpu_available": torch.cuda.is_available(),
        "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0
    }

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/training/jobs", response_model=TrainingJob)
async def create_training_job(
    request: CreateTrainingJobRequest,
    background_tasks: BackgroundTasks,
    user_id: str = "current-user"  # TODO: Get from auth
):
    """Create a new training job"""
    try:
        job = await training_manager.create_job(
            user_id=user_id,
            project_id="current-project",  # TODO: Get from context
            name=request.name,
            description=request.description,
            model_type=request.model_type,
            base_model=request.base_model,
            dataset_id=request.dataset_id,
            config=request.config
        )
        
        # Start training in background
        background_tasks.add_task(training_manager.start_training, job.id)
        
        TRAINING_REQUESTS.labels(model_type=request.model_type.value, status="created").inc()
        
        return job
    except Exception as e:
        logger.error("Failed to create training job", error=str(e))
        TRAINING_REQUESTS.labels(model_type=request.model_type.value, status="failed").inc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/training/jobs/{job_id}", response_model=TrainingJob)
async def get_training_job(job_id: str):
    """Get training job details"""
    job = await training_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    return job

@app.get("/training/jobs", response_model=List[TrainingJob])
async def list_training_jobs(
    user_id: str = "current-user",  # TODO: Get from auth
    status: Optional[TrainingStatus] = None,
    model_type: Optional[ModelType] = None,
    limit: int = 20,
    offset: int = 0
):
    """List training jobs"""
    jobs = await training_manager.list_jobs(
        user_id=user_id,
        status=status,
        model_type=model_type,
        limit=limit,
        offset=offset
    )
    return jobs

@app.post("/training/jobs/{job_id}/cancel")
async def cancel_training_job(job_id: str):
    """Cancel a training job"""
    success = await training_manager.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Training job not found or cannot be cancelled")
    return {"message": "Training job cancelled successfully"}

@app.get("/training/jobs/{job_id}/logs")
async def get_training_logs(job_id: str, lines: int = 100):
    """Get training job logs"""
    logs = await training_manager.get_job_logs(job_id, lines)
    if logs is None:
        raise HTTPException(status_code=404, detail="Training job not found")
    return {"logs": logs}

@app.get("/training/jobs/{job_id}/metrics")
async def get_training_metrics(job_id: str):
    """Get training job metrics"""
    metrics = await training_manager.get_job_metrics(job_id)
    if metrics is None:
        raise HTTPException(status_code=404, detail="Training job not found")
    return {"metrics": metrics}

@app.post("/datasets/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = "uploaded_dataset",
    description: str = "",
    user_id: str = "current-user"  # TODO: Get from auth
):
    """Upload a training dataset"""
    try:
        dataset_id = await data_manager.upload_dataset(
            file=file,
            name=name,
            description=description,
            user_id=user_id
        )
        return {"dataset_id": dataset_id, "message": "Dataset uploaded successfully"}
    except Exception as e:
        logger.error("Failed to upload dataset", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/datasets")
async def list_datasets(user_id: str = "current-user"):
    """List available datasets"""
    datasets = await data_manager.list_datasets(user_id)
    return {"datasets": datasets}

@app.get("/datasets/{dataset_id}")
async def get_dataset(dataset_id: str):
    """Get dataset details"""
    dataset = await data_manager.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@app.post("/models/{model_id}/deploy", response_model=ModelDeployment)
async def deploy_model(
    model_id: str,
    deployment_config: Dict[str, Any] = {},
    user_id: str = "current-user"  # TODO: Get from auth
):
    """Deploy a trained model"""
    try:
        deployment = await deployment_manager.deploy_model(
            model_id=model_id,
            user_id=user_id,
            config=deployment_config
        )
        
        MODEL_DEPLOYMENTS.labels(model_type="unknown", status="created").inc()
        
        return deployment
    except Exception as e:
        logger.error("Failed to deploy model", error=str(e))
        MODEL_DEPLOYMENTS.labels(model_type="unknown", status="failed").inc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def list_models(user_id: str = "current-user"):
    """List available models"""
    models = await model_manager.list_models(user_id)
    return {"models": models}

@app.get("/models/{model_id}")
async def get_model(model_id: str):
    """Get model details"""
    model = await model_manager.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model

@app.post("/models/{model_id}/evaluate")
async def evaluate_model(
    model_id: str,
    dataset_id: str,
    background_tasks: BackgroundTasks
):
    """Evaluate a model on a dataset"""
    try:
        evaluation_id = await evaluation_manager.create_evaluation(
            model_id=model_id,
            dataset_id=dataset_id
        )
        
        # Start evaluation in background
        background_tasks.add_task(evaluation_manager.run_evaluation, evaluation_id)
        
        return {"evaluation_id": evaluation_id, "message": "Evaluation started"}
    except Exception as e:
        logger.error("Failed to start evaluation", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/evaluations/{evaluation_id}")
async def get_evaluation(evaluation_id: str):
    """Get evaluation results"""
    evaluation = await evaluation_manager.get_evaluation(evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return evaluation

@app.get("/templates")
async def list_model_templates():
    """List available model templates"""
    templates = await model_manager.list_templates()
    return {"templates": templates}

@app.get("/templates/{template_id}")
async def get_model_template(template_id: str):
    """Get model template details"""
    template = await model_manager.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8010)),
        reload=os.getenv("NODE_ENV") == "development"
    )
