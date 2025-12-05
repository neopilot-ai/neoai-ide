# NeoAI IDE - AI-First Development Environment

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

> The next-generation IDE with autonomous AI agents and intelligent code assistance

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/neopilot-ai/neoai-ide.git
cd neoai-ide

# Setup environment
make setup

# Start development servers
make dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the IDE.

## ✨ Features

### 🤖 AI-Powered Development
- **Intelligent Code Completion**: Context-aware suggestions powered by multiple AI models
- **Autonomous Agents**: Delegate entire features to AI agents that work across multiple files
- **Multi-File Reasoning**: AI understands your entire project structure and dependencies
- **Natural Language Programming**: Describe what you want and watch AI implement it

### 🛠️ Modern IDE Experience
- **Monaco Editor**: VS Code-quality editing experience with syntax highlighting
- **File Explorer**: Intuitive project navigation with real-time file operations
- **Integrated Terminal**: Built-in terminal with command execution
- **Live Preview**: Instant preview of web applications with hot reload

### 🔄 Seamless Workflow
- **Git Integration**: Visual Git operations without command line complexity
- **One-Click Deployment**: Deploy to multiple platforms with single click
- **Real-Time Collaboration**: Share workspaces and code with team members
- **Project Templates**: Quick start with pre-configured project templates

### 🔒 Enterprise Ready
- **Security First**: Zero-trust architecture with end-to-end encryption
- **Team Management**: Role-based access control and team workspaces
- **Audit Logs**: Complete audit trail for compliance requirements
- **On-Premise**: Self-hosted deployment options for enterprise security

## 🏗️ Architecture

NeoAI IDE is built with a modern microservices architecture:

```
Frontend (React + TypeScript)
├── Desktop App (Electron)
├── Web App (Next.js)
└── Mobile App (React Native) [Future]

Backend Services
├── API Gateway (Node.js)
├── User Service (Node.js + Prisma)
├── Project Service (Node.js + Prisma)
├── AI Service (Python + ReadyAPI)
├── Agent Service (Python + ReadyAPI)
├── Git Service (Go)
└── Preview Service (Node.js + Docker)

Infrastructure
├── PostgreSQL (Primary Database)
├── Redis (Caching & Sessions)
├── Vector DB (AI Embeddings)
├── Object Storage (File Storage)
└── Kubernetes (Container Orchestration)
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Environment Setup

1. **Copy environment files:**
   ```bash
   make env-copy
   ```

2. **Configure your environment:**
   Edit the `.env` files with your API keys and configuration:
   - OpenAI API key for AI features
   - Database connection strings
   - OAuth provider credentials

3. **Install dependencies:**
   ```bash
   make install
   ```

4. **Setup database:**
   ```bash
   make setup-db
   ```

### Development Commands

```bash
# Start all services
make dev

# Start only frontend
make dev-frontend

# Start only backend services
make dev-backend

# Run tests
make test

# Build for production
make build

# Check service health
make health
```

### Docker Development

```bash
# Start with Docker
make docker-up

# View logs
make docker-logs

# Stop services
make docker-down
```

## 📁 Project Structure

```
neoai-ide/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── pages/             # Next.js pages
│   ├── store/             # State management
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
├── backend/               # Backend services
│   ├── api-gateway/       # API Gateway service
│   ├── user-service/      # User management
│   ├── project-service/   # Project & file management
│   ├── ai-service/        # AI model orchestration
│   └── agent-service/     # Agent workflows
├── docs/                  # Documentation
│   ├── product/           # Product specifications
│   ├── technical/         # Technical documentation
│   ├── legal/             # Legal and compliance
│   └── planning/          # Project planning
├── docker-compose.yml     # Docker services
├── Makefile              # Development commands
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables

Key environment variables you need to configure:

```bash
# AI Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/neoai_ide
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your_jwt_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Storage
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
S3_BUCKET=your_s3_bucket
```

### AI Model Configuration

NeoAI IDE supports multiple AI providers:

- **OpenAI**: GPT-4, GPT-3.5 Turbo, Codex
- **Anthropic**: Claude-3 family (Opus, Sonnet, Haiku)
- **Self-Hosted**: Code Llama, Mistral, custom models

Configure model routing and fallbacks in the AI service configuration.

## 🧪 Testing

```bash
# Run all tests
make test

# Frontend tests
npm test

# Backend tests
cd backend/user-service && npm test
cd backend/ai-service && python -m pytest

# End-to-end tests
npm run test:e2e
```

## 📚 Documentation

- **[Product Specification](docs/product/product-spec.md)** - Complete product vision and requirements
- **[User Journeys](docs/product/user-journeys.md)** - Core user workflows and interactions
- **[Technical Architecture](docs/technical/architecture.md)** - System design and architecture
- **[Security Review](docs/technical/security-review.md)** - Security framework and threat model
- **[API Documentation](docs/api/)** - Complete API reference
- **[Deployment Guide](docs/deployment/)** - Production deployment instructions

## 🚀 Deployment

### Development Deployment

```bash
# Deploy to staging
make deploy-staging

# Deploy to production
make deploy-production
```

### Production Deployment

NeoAI IDE can be deployed on:

- **Cloud Platforms**: AWS, GCP, Azure
- **Container Orchestration**: Kubernetes, Docker Swarm
- **Serverless**: Vercel, Netlify (frontend), AWS Lambda (backend)
- **On-Premise**: Self-hosted with Docker Compose

See the [Deployment Guide](docs/deployment/) for detailed instructions.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `make test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- **Frontend**: ESLint + Prettier with TypeScript strict mode
- **Backend**: ESLint for Node.js, Black + isort for Python
- **Commits**: Conventional Commits format

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Monaco Editor** - VS Code editor component
- **OpenAI** - GPT models for AI assistance
- **Anthropic** - Claude models for advanced reasoning
- **Vercel** - Deployment and hosting platform
- **Prisma** - Database toolkit and ORM

## 📞 Support

- **Documentation**: [docs.neoai-ide.com](https://docs.neoai-ide.com)
- **Community**: [Discord](https://discord.gg/neoai-ide)
- **Issues**: [GitHub Issues](https://github.com/neopilot-ai/neoai-ide/issues)
- **Email**: support@neoai-ide.com

## 🗺️ Roadmap

### Phase 1 - MVP (Current)
- ✅ Core IDE functionality
- ✅ AI chat interface
- ✅ Basic agent workflows
- ✅ Git integration
- ✅ Live preview

### Phase 2 - Core Product
- 🔄 Advanced agent workflows
- 🔄 Real-time collaboration
- 🔄 Enhanced deployment
- 🔄 Enterprise features

### Phase 3 - Scale
- ⏳ Custom model training
- ⏳ Advanced debugging
- ⏳ Plugin marketplace
- ⏳ Mobile application

### Phase 4 - Enterprise
- ⏳ On-premise deployment
- ⏳ Advanced security
- ⏳ Custom integrations
- ⏳ Professional services

---

<div align="center">
  <strong>Built with ❤️ by the NeoAI IDE Team</strong>
</div>
