# NeoAI IDE - Development Makefile

.PHONY: help install dev build test clean docker-build docker-up docker-down setup-db

# Default target
help:
	@echo "NeoAI IDE Development Commands"
	@echo "=============================="
	@echo ""
	@echo "Setup Commands:"
	@echo "  install     - Install all dependencies"
	@echo "  setup-db    - Setup database and run migrations"
	@echo "  setup       - Full setup (install + database)"
	@echo ""
	@echo "Development Commands:"
	@echo "  dev         - Start development servers"
	@echo "  dev-frontend - Start only frontend development server"
	@echo "  dev-backend  - Start only backend services"
	@echo ""
	@echo "Docker Commands:"
	@echo "  docker-build - Build all Docker images"
	@echo "  docker-up   - Start all services with Docker"
	@echo "  docker-down - Stop all Docker services"
	@echo "  docker-logs - Show Docker logs"
	@echo ""
	@echo "Database Commands:"
	@echo "  db-migrate  - Run database migrations"
	@echo "  db-seed     - Seed database with sample data"
	@echo "  db-reset    - Reset database (drop and recreate)"
	@echo ""
	@echo "Build Commands:"
	@echo "  build       - Build all services for production"
	@echo "  test        - Run all tests"
	@echo "  lint        - Run linting on all code"
	@echo "  clean       - Clean build artifacts"

# Installation
install:
	@echo "Installing dependencies..."
	npm ci
	cd backend/api-gateway && npm ci
	cd backend/user-service && npm ci
	cd backend/project-service && npm ci
	cd backend/ai-service && pip install -r requirements.txt
	@echo "Dependencies installed"

# Database setup
setup-db:
	@echo "Setting up database..."
	cd backend/user-service && $(shell grep DATABASE_URL .env) npx prisma generate && $(shell grep DATABASE_URL .env) npx prisma migrate dev
	cd backend/project-service && $(shell grep DATABASE_URL .env) npx prisma generate && $(shell grep DATABASE_URL .env) npx prisma migrate dev
	@echo "Database setup complete"

# Full setup
setup: install setup-db
	@echo "Setup complete! Run 'make dev' to start development"

# Development
dev:
	npx concurrently \
		"npm run dev" \
		"cd backend/api-gateway && npm run dev" \
		"cd backend/user-service && npm run dev" \
		"cd backend/project-service && npm run dev" \
		"cd backend/ai-service && python -m uvicorn main:app --host 0.0.0.0 --port 8003 --reload"

dev-frontend:
	@echo "Starting frontend development server..."
	npm run dev

dev-backend:
	@echo "Starting backend services..."
	docker-compose up -d postgres redis
	sleep 5
	npx concurrently \
		"cd backend/api-gateway && npm run dev" \
		"cd backend/user-service && npm run dev" \
		"cd backend/project-service && npm run dev" \
		"cd backend/ai-service && python -m uvicorn main:app --host 0.0.0.0 --port 8003 --reload"

# Docker commands
docker-build:
	@echo "Building Docker images..."
	docker-compose build

docker-up:
	@echo "Starting all services with Docker..."
	docker-compose up -d
	@echo "All services started"
	@echo "Frontend: http://localhost:3000"
	@echo "API Gateway: http://localhost:8000"

docker-down:
	@echo "Stopping Docker services..."
	docker-compose down

docker-logs:
	@echo "Showing Docker logs..."
	docker-compose logs -f

# Database commands
db-migrate:
	@echo "Running database migrations..."
	cd backend/user-service && npx prisma migrate dev
	cd backend/project-service && npx prisma migrate dev

db-seed:
	@echo "Seeding database..."
	cd backend/user-service && npm run db:seed
	cd backend/project-service && npm run db:seed

db-reset:
	@echo "Resetting database..."
	docker-compose down postgres
	docker volume rm neoai-ide_postgres_data
	docker-compose up -d postgres
	sleep 10
	make db-migrate
	make db-seed

# Build commands
build:
	@echo "Building for production..."
	npm run build
	cd backend/api-gateway && npm run build
	cd backend/user-service && npm run build
	cd backend/project-service && npm run build

test:
	@echo "Running tests..."
	npm test
	cd backend/api-gateway && npm test
	cd backend/user-service && npm test
	cd backend/project-service && npm test
	cd backend/ai-service && python -m pytest

lint:
	@echo "Running linters..."
	npm run lint
	cd backend/api-gateway && npm run lint
	cd backend/user-service && npm run lint
	cd backend/project-service && npm run lint

clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist
	rm -rf .next
	rm -rf node_modules/.cache
	cd backend/api-gateway && rm -rf dist
	cd backend/user-service && rm -rf dist
	cd backend/project-service && rm -rf dist

# Environment setup
env-copy:
	@echo "Copying environment files..."
	cp .env.example .env

	@echo "Please update the .env files with your configuration"

# Health check
health:
	@echo "Checking service health..."
	curl -f http://localhost:8000/health || echo "API Gateway down"
	curl -f http://localhost:8001/health || echo "User Service down"
	curl -f http://localhost:8002/health || echo "Project Service down"
	curl -f http://localhost:8003/health || echo "AI Service down"
	curl -f http://localhost:3000 || echo "Frontend down"

# Production deployment
deploy-staging:
	@echo "Deploying to staging..."
	# Add staging deployment commands here

deploy-production:
	@echo "Deploying to production..."
	# Add production deployment commands here

# Backup
backup:
	@echo "Creating backup..."
	docker exec neoai-postgres pg_dump -U neoai neoai_ide > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup created"

# Monitoring
logs:
	@echo "Showing application logs..."
	tail -f backend/*/logs/*.log

# Security
security-scan:
	@echo "Running security scan..."
	npm audit
	cd backend/api-gateway && npm audit
	cd backend/user-service && npm audit
	cd backend/project-service && npm audit
	cd backend/ai-service && pip-audit

