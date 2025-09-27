"""
Training Manager - Handles model training orchestration and lifecycle management
"""

import os
import json
import asyncio
import uuid
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
import shutil

import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
from transformers import (
    AutoTokenizer, AutoModelForCausalLM, AutoModelForSequenceClassification,
    TrainingArguments, Trainer, DataCollatorForLanguageModeling,
    EarlyStoppingCallback, TrainerCallback
)
from datasets import Dataset, load_dataset
from peft import LoraConfig, get_peft_model, TaskType, PeftModel
import wandb
from accelerate import Accelerator
import deepspeed
import structlog

from .base_manager import BaseManager
from ..models.training_models import TrainingJob, TrainingConfig, TrainingStatus, ModelType

logger = structlog.get_logger(__name__)

class TrainingProgressCallback(TrainerCallback):
    """Custom callback to track training progress"""
    
    def __init__(self, training_manager, job_id: str):
        self.training_manager = training_manager
        self.job_id = job_id
        self.start_time = None
        
    def on_train_begin(self, args, state, control, **kwargs):
        self.start_time = datetime.utcnow()
        asyncio.create_task(
            self.training_manager.update_job_status(
                self.job_id, 
                TrainingStatus.TRAINING,
                progress=0.0
            )
        )
        
    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs:
            # Update metrics
            asyncio.create_task(
                self.training_manager.update_job_metrics(self.job_id, logs)
            )
            
            # Calculate progress
            if state.max_steps > 0:
                progress = (state.global_step / state.max_steps) * 100
                asyncio.create_task(
                    self.training_manager.update_job_progress(self.job_id, progress)
                )
                
    def on_train_end(self, args, state, control, **kwargs):
        asyncio.create_task(
            self.training_manager.update_job_status(
                self.job_id,
                TrainingStatus.COMPLETED,
                progress=100.0
            )
        )

class TrainingManager(BaseManager):
    """Manages model training jobs and orchestration"""
    
    def __init__(self, redis_client):
        super().__init__(redis_client)
        self.active_jobs: Dict[str, asyncio.Task] = {}
        self.job_processes: Dict[str, Any] = {}
        self.models_dir = Path(os.getenv('MODELS_DIR', '/tmp/neoai-models'))
        self.datasets_dir = Path(os.getenv('DATASETS_DIR', '/tmp/neoai-datasets'))
        
    async def initialize(self):
        """Initialize the training manager"""
        logger.info("Initializing Training Manager...")
        
        # Create directories
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.datasets_dir.mkdir(parents=True, exist_ok=True)
        
        # Resume any interrupted jobs
        await self.resume_interrupted_jobs()
        
        logger.info("Training Manager initialized successfully")
        
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up Training Manager...")
        
        # Cancel all active jobs
        for job_id, task in self.active_jobs.items():
            if not task.done():
                task.cancel()
                await self.update_job_status(job_id, TrainingStatus.CANCELLED)
                
        # Wait for tasks to complete
        if self.active_jobs:
            await asyncio.gather(*self.active_jobs.values(), return_exceptions=True)
            
        self.active_jobs.clear()
        self.job_processes.clear()
        
        logger.info("Training Manager cleanup complete")
        
    async def create_job(
        self,
        user_id: str,
        project_id: str,
        name: str,
        description: str,
        model_type: ModelType,
        base_model: str,
        dataset_id: str,
        config: TrainingConfig
    ) -> TrainingJob:
        """Create a new training job"""
        
        job_id = str(uuid.uuid4())
        
        # Estimate training duration
        estimated_duration = await self.estimate_training_duration(config, dataset_id)
        
        job = TrainingJob(
            id=job_id,
            user_id=user_id,
            project_id=project_id,
            name=name,
            description=description,
            model_type=model_type,
            base_model=base_model,
            dataset_id=dataset_id,
            config=config,
            estimated_duration=estimated_duration
        )
        
        # Store job in Redis
        await self.redis_client.hset(
            f"training_job:{job_id}",
            mapping=job.model_dump_json()
        )
        
        # Add to user's job list
        await self.redis_client.sadd(f"user_jobs:{user_id}", job_id)
        
        logger.info(f"Created training job {job_id} for user {user_id}")
        return job
        
    async def start_training(self, job_id: str) -> bool:
        """Start training for a job"""
        try:
            job = await self.get_job(job_id)
            if not job:
                logger.error(f"Job {job_id} not found")
                return False
                
            if job.status != TrainingStatus.PENDING:
                logger.warning(f"Job {job_id} is not in pending status: {job.status}")
                return False
                
            # Update status to preparing
            await self.update_job_status(job_id, TrainingStatus.PREPARING)
            
            # Start training task
            task = asyncio.create_task(self._run_training(job))
            self.active_jobs[job_id] = task
            
            logger.info(f"Started training for job {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start training for job {job_id}: {e}")
            await self.update_job_status(job_id, TrainingStatus.FAILED, error_message=str(e))
            return False
            
    async def _run_training(self, job: TrainingJob):
        """Run the actual training process"""
        try:
            job_id = job.id
            logger.info(f"Starting training process for job {job_id}")
            
            # Update started time
            await self.update_job_field(job_id, "started_at", datetime.utcnow().isoformat())
            
            # Prepare training environment
            training_dir = self.models_dir / job_id
            training_dir.mkdir(parents=True, exist_ok=True)
            
            # Load dataset
            dataset = await self.load_dataset(job.dataset_id)
            if not dataset:
                raise ValueError(f"Dataset {job.dataset_id} not found")
                
            # Prepare model and tokenizer
            model, tokenizer = await self.prepare_model(job.base_model, job.config)
            
            # Prepare training data
            train_dataset, eval_dataset = await self.prepare_training_data(
                dataset, tokenizer, job.config
            )
            
            # Setup training arguments
            training_args = self.create_training_arguments(job.config, training_dir)
            
            # Setup callbacks
            callbacks = [
                TrainingProgressCallback(self, job_id),
                EarlyStoppingCallback(
                    early_stopping_patience=job.config.early_stopping_patience,
                    early_stopping_threshold=job.config.early_stopping_threshold
                ) if job.config.early_stopping else None
            ]
            callbacks = [cb for cb in callbacks if cb is not None]
            
            # Initialize Weights & Biases if configured
            if os.getenv('WANDB_API_KEY'):
                wandb.init(
                    project="neoai-model-training",
                    name=f"{job.name}-{job_id[:8]}",
                    config=job.config.model_dump(),
                    tags=[job.model_type.value, job.base_model]
                )
            
            # Create trainer
            trainer = Trainer(
                model=model,
                args=training_args,
                train_dataset=train_dataset,
                eval_dataset=eval_dataset,
                tokenizer=tokenizer,
                data_collator=DataCollatorForLanguageModeling(
                    tokenizer=tokenizer,
                    mlm=False
                ),
                callbacks=callbacks
            )
            
            # Start training
            logger.info(f"Starting model training for job {job_id}")
            trainer.train()
            
            # Save model
            model_path = training_dir / "final_model"
            trainer.save_model(model_path)
            tokenizer.save_pretrained(model_path)
            
            # Save training metrics
            if trainer.state.log_history:
                metrics_path = training_dir / "training_metrics.json"
                with open(metrics_path, 'w') as f:
                    json.dump(trainer.state.log_history, f, indent=2)
                    
            # Create model artifacts
            artifacts = await self.create_model_artifacts(job_id, training_dir)
            await self.update_job_field(job_id, "artifacts", [a.model_dump() for a in artifacts])
            
            # Update completion time
            await self.update_job_field(job_id, "completed_at", datetime.utcnow().isoformat())
            
            # Finish wandb run
            if os.getenv('WANDB_API_KEY'):
                wandb.finish()
                
            logger.info(f"Training completed successfully for job {job_id}")
            
        except Exception as e:
            logger.error(f"Training failed for job {job_id}: {e}")
            await self.update_job_status(job_id, TrainingStatus.FAILED, error_message=str(e))
            
            # Finish wandb run with error
            if os.getenv('WANDB_API_KEY'):
                wandb.finish(exit_code=1)
                
        finally:
            # Cleanup
            if job_id in self.active_jobs:
                del self.active_jobs[job_id]
                
    async def prepare_model(self, base_model: str, config: TrainingConfig):
        """Prepare model and tokenizer for training"""
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(base_model)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
            
        # Load model
        model = AutoModelForCausalLM.from_pretrained(
            base_model,
            torch_dtype=torch.float16 if config.fp16 else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None
        )
        
        # Apply LoRA if configured
        if config.use_lora:
            lora_config = LoraConfig(
                task_type=TaskType.CAUSAL_LM,
                r=config.lora_r,
                lora_alpha=config.lora_alpha,
                lora_dropout=config.lora_dropout,
                target_modules=config.lora_target_modules,
                bias="none"
            )
            model = get_peft_model(model, lora_config)
            model.print_trainable_parameters()
            
        return model, tokenizer
        
    async def prepare_training_data(self, dataset: Dataset, tokenizer, config: TrainingConfig):
        """Prepare training and evaluation datasets"""
        
        def tokenize_function(examples):
            # Tokenize the text
            tokenized = tokenizer(
                examples["text"],
                truncation=True,
                padding=False,
                max_length=config.max_sequence_length,
                return_overflowing_tokens=False,
            )
            
            # For causal language modeling, labels are the same as input_ids
            tokenized["labels"] = tokenized["input_ids"].copy()
            
            return tokenized
            
        # Tokenize dataset
        tokenized_dataset = dataset.map(
            tokenize_function,
            batched=True,
            remove_columns=dataset.column_names
        )
        
        # Split into train/eval if not already split
        if "train" in tokenized_dataset:
            train_dataset = tokenized_dataset["train"]
            eval_dataset = tokenized_dataset.get("validation") or tokenized_dataset.get("test")
        else:
            # Split the dataset
            split_dataset = tokenized_dataset.train_test_split(test_size=0.1)
            train_dataset = split_dataset["train"]
            eval_dataset = split_dataset["test"]
            
        return train_dataset, eval_dataset
        
    def create_training_arguments(self, config: TrainingConfig, output_dir: Path) -> TrainingArguments:
        """Create training arguments from config"""
        
        return TrainingArguments(
            output_dir=str(output_dir),
            overwrite_output_dir=True,
            
            # Training parameters
            learning_rate=config.learning_rate,
            per_device_train_batch_size=config.batch_size,
            per_device_eval_batch_size=config.batch_size,
            num_train_epochs=config.num_epochs,
            warmup_steps=config.warmup_steps,
            weight_decay=config.weight_decay,
            gradient_accumulation_steps=config.gradient_accumulation_steps,
            max_grad_norm=config.max_grad_norm,
            
            # Optimization
            optim=config.optimizer,
            lr_scheduler_type=config.scheduler,
            fp16=config.fp16,
            
            # Logging and evaluation
            logging_steps=config.logging_steps,
            eval_steps=config.eval_steps,
            evaluation_strategy="steps",
            save_steps=config.save_steps,
            save_strategy="steps",
            
            # Other settings
            dataloader_drop_last=True,
            remove_unused_columns=False,
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            
            # Distributed training
            local_rank=-1,
            deepspeed=config.deepspeed_config,
            
            # Reporting
            report_to=["wandb"] if os.getenv('WANDB_API_KEY') else [],
            run_name=f"training-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
        )
        
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a training job"""
        try:
            job = await self.get_job(job_id)
            if not job:
                return False
                
            if job.status in [TrainingStatus.COMPLETED, TrainingStatus.FAILED, TrainingStatus.CANCELLED]:
                return False
                
            # Cancel the training task
            if job_id in self.active_jobs:
                task = self.active_jobs[job_id]
                task.cancel()
                
            # Update status
            await self.update_job_status(job_id, TrainingStatus.CANCELLED)
            
            logger.info(f"Cancelled training job {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cancel job {job_id}: {e}")
            return False
            
    async def get_job(self, job_id: str) -> Optional[TrainingJob]:
        """Get a training job by ID"""
        try:
            job_data = await self.redis_client.hget(f"training_job:{job_id}", "data")
            if job_data:
                return TrainingJob.model_validate_json(job_data)
            return None
        except Exception as e:
            logger.error(f"Failed to get job {job_id}: {e}")
            return None
            
    async def list_jobs(
        self,
        user_id: str,
        status: Optional[TrainingStatus] = None,
        model_type: Optional[ModelType] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[TrainingJob]:
        """List training jobs for a user"""
        try:
            # Get user's job IDs
            job_ids = await self.redis_client.smembers(f"user_jobs:{user_id}")
            
            jobs = []
            for job_id in job_ids:
                job = await self.get_job(job_id)
                if job:
                    # Apply filters
                    if status and job.status != status:
                        continue
                    if model_type and job.model_type != model_type:
                        continue
                    jobs.append(job)
                    
            # Sort by creation time (newest first)
            jobs.sort(key=lambda x: x.created_at, reverse=True)
            
            # Apply pagination
            return jobs[offset:offset + limit]
            
        except Exception as e:
            logger.error(f"Failed to list jobs for user {user_id}: {e}")
            return []
            
    async def update_job_status(
        self,
        job_id: str,
        status: TrainingStatus,
        progress: Optional[float] = None,
        error_message: Optional[str] = None
    ):
        """Update job status"""
        updates = {"status": status.value}
        
        if progress is not None:
            updates["progress"] = progress
            
        if error_message:
            updates["error_message"] = error_message
            
        await self.update_job_fields(job_id, updates)
        
    async def update_job_progress(self, job_id: str, progress: float):
        """Update job progress"""
        await self.update_job_field(job_id, "progress", progress)
        
    async def update_job_metrics(self, job_id: str, metrics: Dict[str, float]):
        """Update job metrics"""
        # Get current metrics
        job = await self.get_job(job_id)
        if job:
            current_metrics = job.metrics.copy()
            current_metrics.update(metrics)
            await self.update_job_field(job_id, "metrics", current_metrics)
            
    async def update_job_field(self, job_id: str, field: str, value: Any):
        """Update a single job field"""
        await self.update_job_fields(job_id, {field: value})
        
    async def update_job_fields(self, job_id: str, updates: Dict[str, Any]):
        """Update multiple job fields"""
        try:
            # Get current job data
            job_data = await self.redis_client.hget(f"training_job:{job_id}", "data")
            if job_data:
                job_dict = json.loads(job_data)
                job_dict.update(updates)
                
                # Save updated job
                await self.redis_client.hset(
                    f"training_job:{job_id}",
                    "data",
                    json.dumps(job_dict)
                )
                
        except Exception as e:
            logger.error(f"Failed to update job {job_id}: {e}")
            
    async def get_job_logs(self, job_id: str, lines: int = 100) -> Optional[List[str]]:
        """Get training job logs"""
        try:
            logs = await self.redis_client.lrange(f"job_logs:{job_id}", -lines, -1)
            return logs
        except Exception as e:
            logger.error(f"Failed to get logs for job {job_id}: {e}")
            return None
            
    async def get_job_metrics(self, job_id: str) -> Optional[Dict[str, float]]:
        """Get training job metrics"""
        job = await self.get_job(job_id)
        return job.metrics if job else None
        
    async def estimate_training_duration(self, config: TrainingConfig, dataset_id: str) -> int:
        """Estimate training duration in seconds"""
        # This is a simplified estimation - in practice, you'd want more sophisticated logic
        base_time = 3600  # 1 hour base
        
        # Adjust based on epochs
        time_per_epoch = base_time * config.num_epochs
        
        # Adjust based on model size and batch size
        if config.batch_size < 8:
            time_per_epoch *= 1.5
        elif config.batch_size > 16:
            time_per_epoch *= 0.8
            
        # Adjust based on LoRA usage
        if config.use_lora:
            time_per_epoch *= 0.6  # LoRA is faster
            
        return int(time_per_epoch)
        
    async def resume_interrupted_jobs(self):
        """Resume jobs that were interrupted"""
        # TODO: Implement logic to resume interrupted training jobs
        pass
        
    async def load_dataset(self, dataset_id: str) -> Optional[Dataset]:
        """Load a dataset by ID"""
        # TODO: Implement dataset loading logic
        # This would typically load from the data manager
        return None
        
    async def create_model_artifacts(self, job_id: str, training_dir: Path):
        """Create model artifacts after training"""
        # TODO: Implement artifact creation logic
        return []
