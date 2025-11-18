# Rayls Documentation

Welcome to the Rayls documentation. This directory contains all project documentation organized by topic.

## 📚 Documentation Structure

### [Getting Started](/guides)
Start here if you're new to the project:
- **[START_HERE.md](guides/START_HERE.md)** - Project overview and quick orientation
- **[SETUP_GUIDE.md](guides/SETUP_GUIDE.md)** - Development environment setup and troubleshooting
- **[HELLO_WORLD_DEPLOY.md](guides/HELLO_WORLD_DEPLOY.md)** - First deployment validation

### [Architecture & Design](/architecture)
Deep dive into system design and patterns:
- **[ARCHITECTURE.md](architecture/ARCHITECTURE.md)** - Comprehensive architecture documentation
- **[ARCHITECTURE_SUMMARY.md](architecture/ARCHITECTURE_SUMMARY.md)** - Quick architecture reference
- **[EVENT_DRIVEN_IMPLEMENTATION.md](architecture/EVENT_DRIVEN_IMPLEMENTATION.md)** - Event-driven architecture details

### [Deployment & Operations](/deployment)
Deployment guides and operational information:
- **[DEPLOYMENT_GUIDE.md](deployment/DEPLOYMENT_GUIDE.md)** - Step-by-step deployment process
- **[DEPLOYMENT_ROADMAP.md](deployment/DEPLOYMENT_ROADMAP.md)** - Phased deployment plan
- **[DEPLOYMENT_CHECKLIST.md](deployment/DEPLOYMENT_CHECKLIST.md)** - Pre-deployment checklist
- **[CHECKPOINT_STATUS.md](deployment/CHECKPOINT_STATUS.md)** - Current project status

### [Reference](/reference)
Reference documentation and additional resources:
- **[CLAUDE.md](reference/CLAUDE.md)** - Claude Code guidance for this project
- **[PROJECT_SUMMARY.md](reference/PROJECT_SUMMARY.md)** - Project summary
- **[IMPLEMENTATION_COMPLETE.md](reference/IMPLEMENTATION_COMPLETE.md)** - Implementation completion status
- **[TEST_STABLECOIN_CREATE.md](reference/TEST_STABLECOIN_CREATE.md)** - Testing stablecoin creation

## 🚀 Quick Start

1. **New to the project?** → Read [START_HERE.md](guides/START_HERE.md)
2. **Setting up environment?** → Follow [SETUP_GUIDE.md](guides/SETUP_GUIDE.md)
3. **Understanding architecture?** → Check [ARCHITECTURE_SUMMARY.md](architecture/ARCHITECTURE_SUMMARY.md)
4. **Ready to deploy?** → Review [DEPLOYMENT_GUIDE.md](deployment/DEPLOYMENT_GUIDE.md)

## 📋 Common Commands

```bash
# Building & Development
pnpm install              # Install dependencies
pnpm run build            # Compile TypeScript
pnpm run start:dev        # Run with ts-node watch mode
pnpm run lint             # ESLint check
pnpm run format           # Prettier format

# Supabase & Deployment
supabase start            # Start local Supabase (requires Docker)
supabase functions serve  # Test Edge Functions locally
supabase functions deploy <name>  # Deploy function to production
supabase db push          # Push migrations to production
```

## 🏗️ Project Overview

**Rayls** is an event-driven, serverless payment gateway that:
- Receives PIX payments from Asaas webhooks
- Processes events asynchronously with complete audit trail (event sourcing)
- Records transactions on blockchain using viem.js
- Deploys incrementally to Supabase Edge Functions (Deno runtime)

## 📁 Root Directory Files

- **README.md** - Project README (root level)
- **.env.example** - Required environment variables
- **CLAUDE.md** - Claude Code guidance (also in reference/)

## 📞 For More Information

Refer to specific documentation files above based on your needs. Each document includes:
- Clear instructions
- Code examples
- Common troubleshooting
- Links to related documentation
