# NeoAI IDE - Setup Guide

This guide will help you set up the NeoAI IDE development environment.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and npm 8+
- Python 3.8+ (for backend AI services)
- Git

## Quick Setup

### Option 1: Automated Setup (Recommended)

Run the complete setup with a single command:

```bash
make setup
```

This will:
1. Copy environment files from `.env.example`
2. Install all dependencies
3. Start PostgreSQL and Redis services
4. Run database migrations

### Option 2: Step-by-Step Setup

If you prefer more control, follow these steps:

#### Step 1: Setup Environment Files

```bash
make env-setup
```

This creates `.env` files in:
- Root directory (`.env`)
- `backend/user-service/.env`
- `backend/project-service/.env`

**Important**: Update the `.env` files with your actual configuration values, especially:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`: AI provider keys
- `JWT_SECRET`: Authentication secret

#### Step 2: Install Dependencies

```bash
make install
```

This installs npm dependencies for all Node.js services and pip packages for Python services.

#### Step 3: Start Database Services

```bash
make docker-up-db
```

This starts PostgreSQL and Redis in Docker containers. The script waits 30 seconds for services to be healthy.

#### Step 4: Setup Database

```bash
make setup-db
```

This runs database migrations. It will automatically start PostgreSQL if not already running.

## Development

### Start All Backend Services

```bash
make dev-backend
```

This starts:
- API Gateway (port 8000)
- User Service (port 8001)
- Project Service (port 8002)
- Database services in Docker

### Start Frontend Development Server

```bash
make dev-frontend
```

Starts the Next.js frontend at `http://localhost:3000`

### Start Everything (Frontend + Backend)

```bash
make dev
```

## Docker Commands

### Start All Services with Docker Compose

```bash
make docker-up
```

### Stop All Docker Services

```bash
make docker-down
```

### View Docker Logs

```bash
make docker-logs
```

## Database Commands

### Run Database Migrations

```bash
make db-migrate
```

### Seed Database with Sample Data

```bash
make db-seed
```

### Reset Database (Drop and Recreate)

```bash
make db-reset
```

## Troubleshooting

### Prisma Schema Validation Error

**Error**: `Environment variable not found: DATABASE_URL`

**Solution**: 
1. Ensure `.env` files exist: `make env-setup`
2. Ensure PostgreSQL is running: `make docker-up-db`
3. Verify `DATABASE_URL` is set in `.env` files

### Database Connection Refused

**Error**: `connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
1. Start PostgreSQL: `make docker-up-db`
2. Wait 30 seconds for the service to be healthy
3. Verify PostgreSQL is running: `docker ps | grep postgres`

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
1. Kill the process using the port: `lsof -i :3000`
2. Or change the port in `.env`: `PORT=3001`

### Missing Dependencies

**Error**: `Module not found: ...`

**Solution**:
1. Reinstall dependencies: `make install`
2. For a clean install: `rm -rf node_modules && make install`

## Environment Variables

### Essential Variables

```env
# Database
DATABASE_URL=postgresql://neoai:password@localhost:5432/neoai_ide

# Authentication
JWT_SECRET=your_jwt_secret_here

# AI Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

See `.env.example` for all available configuration options.

## Build and Deployment

### Build All Services for Production

```bash
make build
```

### Run Tests

```bash
make test
```

### Run Linting

```bash
make lint
```

### Clean Build Artifacts

```bash
make clean
```

## Health Check

```bash
make health
```

This will check the health status of all running services.

## Security Scan

```bash
make security-scan
```

Runs npm audit and pip-audit to check for vulnerabilities.

## Additional Resources

- [Architecture Documentation](docs/technical/architecture.md)
- [API Documentation](docs/api.yaml) - Available at `http://localhost:8000/api/docs` when API Gateway is running
- [Contributing Guidelines](CONTRIBUTING.md)

## Common Issues and Solutions

### Hot Reload Not Working

Make sure you're using the development commands:
```bash
make dev-backend
make dev-frontend
```

### Cannot Connect to Database

1. Verify Docker is running: `docker ps`
2. Check PostgreSQL is healthy: `docker ps | grep postgres`
3. Verify connection string in `.env`

### Services Not Starting

1. Check logs: `make docker-logs`
2. Ensure all ports are available
3. Verify environment variables are set correctly

## Next Steps

1. Complete the setup with `make setup`
2. Start development with `make dev-backend` and `make dev-frontend` in separate terminals
3. Access the frontend at `http://localhost:3000`
4. API Gateway is available at `http://localhost:8000`

Happy coding! 🚀
