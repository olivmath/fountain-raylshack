# 🚀 Fountain - BRL Stablecoin Factory

> **Factory stablecoin issuance for real-world asset tokenizers. Secure, fast, and Rayls-native end to end.**

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://app-fountain.vercel.app/)
[![Rayls Network](https://img.shields.io/badge/network-Rayls%20Mainnet-blue)](https://devnet-rpc.rayls.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**🌐 Live Application**: [https://app-fountain.vercel.app/](https://app-fountain.vercel.app/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Web3 Layer](#web3-layer)
- [Backend Layer](#backend-layer)
- [Frontend Layer](#frontend-layer)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

---

## 🎯 Overview

Fountain is a complete solution for issuing BRL-backed stablecoins on the Rayls Network. It provides:

- **Unified Issuance API**: Mint, burn, and reconcile stablecoins with production-ready SDKs
- **Automated Compliance**: KYC/KYB, sanctions screening, and programmable wallet limits
- **Liquidity Orchestration**: PIX, TED, and crypto rails combined for instant settlement
- **On-chain Treasury**: Proof of reserves, accounting reports, and continuous audit
- **Real-time Dashboard**: Monitor operations, stablecoins, and performance metrics

### Key Features

✅ **Event-Driven Architecture** - Immutable audit trail with event sourcing  
✅ **Production-Ready** - Battle-tested on Rayls Mainnet with 4M BRL MRR  
✅ **Real-time Monitoring** - Live dashboard with auto-refresh capabilities  
✅ **Fully Responsive** - Mobile-first design for all screen sizes  
✅ **Type-Safe** - End-to-end TypeScript coverage  
✅ **Scalable** - Serverless functions with edge computing  

---

## 🏗️ Architecture

Fountain follows a **three-layer architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│                    (Next.js 14 + React)                     │
│  • Dashboard UI with real-time data                         │
│  • Responsive design (mobile/tablet/desktop)                │
│  • Chart visualizations with Recharts                       │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                        Backend Layer                         │
│              (Supabase Edge Functions + Deno)               │
│  • Serverless functions for business logic                  │
│  • API key authentication                                   │
│  • Event sourcing with PostgreSQL                           │
│  • Webhook integrations (Asaas PIX)                         │
└─────────────────────────────────────────────────────────────┘
                              ↓ RPC
┌─────────────────────────────────────────────────────────────┐
│                         Web3 Layer                           │
│              (Solidity + Foundry + Rayls Network)           │
│  • ERC20 token factory contract                             │
│  • Mint/burn token operations                               │
│  • Deployed on Rayls Devnet/Mainnet                         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Next.js Frontend → API Route → Supabase Function
                ↓
        Database (PostgreSQL)
                ↓
        Event Store (Audit Trail)
                ↓
        Blockchain (Rayls Network)
                ↓
        Webhook Notification → Client
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui + Radix UI
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Deployment**: Vercel

### Backend
- **Runtime**: Deno
- **Framework**: Supabase Edge Functions
- **Database**: PostgreSQL (Supabase)
- **Language**: TypeScript
- **Authentication**: API Key (SHA-256)
- **Payments**: Asaas (PIX processor)
- **Event Store**: Event Sourcing pattern

### Web3
- **Smart Contracts**: Solidity 0.8.x
- **Development**: Foundry
- **Network**: Rayls Devnet/Mainnet (Chain ID: 123123)
- **Standard**: ERC20 with mint/burn
- **Library**: Viem.js (TypeScript)

---

## 📁 Project Structure

```
fountain/
├── back-end/                    # Backend services
│   ├── supabase/
│   │   ├── functions/          # Edge Functions (API)
│   │   │   ├── stablecoin-create/      # Register & deploy stablecoin
│   │   │   ├── deposit-request/        # Generate PIX QR code
│   │   │   ├── withdraw/               # Burn tokens & transfer PIX
│   │   │   ├── webhook-deposit/        # Asaas deposit webhook
│   │   │   ├── webhook-withdraw/       # Asaas withdraw webhook
│   │   │   ├── get-stablecoin-info/    # Query stablecoin details
│   │   │   ├── get-stablecoin-stats/   # Aggregated statistics
│   │   │   ├── get-operation-details/  # Operation details + logs
│   │   │   ├── list-client-stablecoins/    # List all stablecoins
│   │   │   ├── list-client-operations/     # List all operations
│   │   │   ├── list-stablecoin-operations/ # Operations per stablecoin
│   │   │   └── shared/         # Reusable modules
│   │   │       ├── types.ts            # TypeScript interfaces
│   │   │       ├── auth.ts             # API key validation
│   │   │       ├── logger.ts           # Database logging
│   │   │       ├── error-handler.ts    # Error management
│   │   │       ├── supabase-client.ts  # DB client
│   │   │       ├── asaas-client.ts     # PIX integration
│   │   │       ├── blockchain-client.ts    # Web3 client
│   │   │       ├── blockchain-minter.ts    # Token operations
│   │   │       ├── event-publisher.ts      # Event sourcing
│   │   │       └── client-notifier.ts      # Webhooks
│   │   └── migrations/         # Database schema
│   │       ├── 20251118_init_schema.sql
│   │       └── 20251119_add_client_tracking.sql
│   ├── web3/                   # Smart contracts
│   │   ├── src/
│   │   │   ├── Stablecoin.sol          # ERC20 token contract
│   │   │   └── StablecoinFactory.sol   # Factory contract
│   │   ├── script/
│   │   │   └── DeployStablecoinFactory.s.sol
│   │   └── test/
│   │       └── StablecoinFactory.t.sol
│   └── tests/                  # Integration tests
│       ├── 01-stablecoin-create.sh
│       ├── 02-deposit-request.sh
│       ├── 03-withdraw.sh
│       └── 04-query-functions.sh
│
├── website/                    # Frontend application
│   ├── app/
│   │   ├── api/
│   │   │   └── dashboard/      # API route for data aggregation
│   │   │       └── route.ts
│   │   ├── dashboard/          # Dashboard page
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Landing page
│   │   └── globals.css
│   ├── components/
│   │   ├── dashboard/          # Dashboard components
│   │   │   ├── header.tsx              # Top navigation
│   │   │   ├── sidebar.tsx             # Side navigation
│   │   │   ├── overview-section.tsx    # Header section
│   │   │   ├── platform-activity.tsx   # Metrics + chart
│   │   │   ├── transactions-chart.tsx  # Line chart
│   │   │   ├── status-breakdown.tsx    # Pie chart
│   │   │   ├── operations-table.tsx    # Full operations table
│   │   │   ├── stablecoin-kpis.tsx    # KPI cards
│   │   │   ├── client-analytics.tsx    # Performance metrics
│   │   │   └── stablecoins-panel.tsx  # Stablecoins list
│   │   └── ui/                # shadcn/ui components
│   │       ├── interactive-empty-state.tsx
│   │       ├── box-loader.tsx
│   │       └── ... (other UI components)
│   ├── hooks/
│   │   └── use-dashboard-data.ts   # Data fetching hook
│   ├── lib/
│   │   ├── dashboard-types.ts      # TypeScript types
│   │   └── dashboard-transforms.ts # Data transformations
│   └── package.json
│
└── docs/                       # Documentation
    ├── README.md               # This file
    ├── ARCHITECTURE.md         # System architecture
    ├── IMPLEMENTATION_COMPLETE.md
    └── QUICK_START.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (for frontend)
- **Deno** 1.x (for backend)
- **Foundry** (for smart contracts)
- **PostgreSQL** (via Supabase)
- **API Keys**: Asaas, Rayls RPC

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/your-org/fountain.git
cd fountain
```

2. **Setup Frontend**
```bash
cd website
npm install
cp .env.example .env.local
npm run dev
```

3. **Setup Backend**
```bash
cd back-end
supabase link --project-ref bzxdqkttnkxqaecaiekt
supabase functions deploy
```

4. **Deploy Smart Contracts**
```bash
cd back-end/web3
forge build
forge script script/DeployStablecoinFactory.s.sol --rpc-url $RAYLS_RPC_URL --broadcast
```

5. **Access Dashboard**
Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

## 🔗 Web3 Layer

### Smart Contracts

Fountain uses a **factory pattern** for deploying ERC20 stablecoins on the Rayls Network.

#### StablecoinFactory.sol

```solidity
contract StablecoinFactory {
    function createStablecoin(
        string memory name,
        string memory symbol,
        address minter,
        uint256 initialSupply
    ) external returns (address stablecoinAddress);
    
    function mintTokens(
        address stablecoinAddress,
        address recipient,
        uint256 amount
    ) external;
    
    function burnTokens(
        address stablecoinAddress,
        address account,
        uint256 amount
    ) external;
}
```

#### Stablecoin.sol (ERC20)

```solidity
contract Stablecoin is ERC20 {
    address public factory;
    address public minter;
    
    function mint(address to, uint256 amount) external onlyMinter;
    function burn(address from, uint256 amount) external onlyMinter;
}
```

### Deployment

**Network**: Rayls Devnet  
**Chain ID**: 123123  
**RPC URL**: https://devnet-rpc.rayls.com  
**Explorer**: https://devnet-explorer.rayls.com  

**Factory Contract**: `0x...` (deployed address)

### Operations

1. **Deploy Stablecoin**
   - Factory creates new ERC20 contract
   - Mints initial supply to client wallet
   - Returns contract address + tx hash

2. **Mint Tokens** (Deposit)
   - User pays via PIX
   - Backend calls `mintTokens()`
   - Tokens sent to user's wallet

3. **Burn Tokens** (Withdrawal)
   - User burns tokens on-chain
   - Backend calls `burnTokens()`
   - PIX transfer initiated

---

## ⚙️ Backend Layer

### Architecture: Serverless Edge Functions

Fountain's backend uses **Supabase Edge Functions** (Deno) for:
- ✅ Zero-downtime deployments
- ✅ Auto-scaling
- ✅ Global edge locations
- ✅ Built-in observability

### Function Categories

#### 1️⃣ **Mutation Functions** (Write Operations)

| Function | Method | Purpose |
|----------|--------|---------|
| `stablecoin-create` | POST | Register & deploy new stablecoin |
| `deposit-request` | POST | Generate PIX QR code for deposit |
| `withdraw` | POST | Burn tokens & initiate PIX transfer |
| `webhook-deposit` | POST | Process Asaas payment confirmation |
| `webhook-withdraw` | POST | Process Asaas transfer confirmation |

#### 2️⃣ **Query Functions** (Read Operations)

| Function | Method | Purpose |
|----------|--------|---------|
| `get-stablecoin-info` | GET | Get stablecoin details by ID or address |
| `get-stablecoin-stats` | GET | Aggregated stats (deposits, withdrawals, volume) |
| `get-operation-details` | GET | Full operation details + logs + events |
| `list-client-stablecoins` | GET | List all stablecoins for authenticated client |
| `list-client-operations` | GET | List all operations across all stablecoins |
| `list-stablecoin-operations` | GET | List operations for specific stablecoin |

### Authentication

All endpoints use **API Key authentication**:

```bash
curl -X GET https://bzxdqkttnkxqaecaiekt.supabase.co/functions/v1/list-client-stablecoins \
  -H "x-api-key: YOUR_API_KEY"
```

API keys are hashed with SHA-256 and stored in the database.

### Event Sourcing

Every operation publishes immutable events to the `event_store` table:

```typescript
{
  event_id: "uuid",
  aggregate_id: "stablecoin_id or operation_id",
  event_type: "stablecoin.registered | deposit.minted | withdraw.completed",
  payload: { ... },
  created_at: "timestamp"
}
```

### Database Schema

```sql
-- Core tables
stablecoins (
  stablecoin_id UUID PRIMARY KEY,
  client_id VARCHAR,
  symbol VARCHAR UNIQUE,
  erc20_address VARCHAR,
  status VARCHAR,
  created_at TIMESTAMP,
  deployed_at TIMESTAMP
)

operations (
  operation_id UUID PRIMARY KEY,
  stablecoin_id UUID REFERENCES stablecoins,
  operation_type VARCHAR, -- 'deposit' | 'withdraw'
  amount DECIMAL,
  status VARCHAR,
  tx_hash VARCHAR,
  created_at TIMESTAMP
)

-- Audit tables
event_store (
  event_id UUID PRIMARY KEY,
  aggregate_id UUID,
  event_type VARCHAR,
  payload JSONB
)

logs (
  log_id UUID PRIMARY KEY,
  operation_id UUID,
  level VARCHAR,
  message TEXT,
  metadata JSONB
)
```

### State Machines

#### Deposit Flow
```
payment_pending → payment_deposited → minting_in_progress → minted → client_notified
```

#### Withdraw Flow
```
burn_initiated → tokens_burned → pix_pending → withdraw_successful → client_notified
```

---

## 🎨 Frontend Layer

### Dashboard Features

The Fountain dashboard provides real-time monitoring of:

1. **Overview Tab**
   - Platform metrics (total volume, deposits, withdrawals)
   - Transaction flow chart (line graph)
   - Operation status breakdown (pie chart)
   - Full operations table with filters

2. **Stablecoins Tab**
   - KPI cards (active, pending, net volume)
   - Client performance analytics
   - Stablecoins list with details
   - Recent operations per stablecoin

### Tech Implementation

#### Data Fetching
```typescript
// hooks/use-dashboard-data.ts
export function useDashboardData() {
  // Fetches from /api/dashboard
  // Auto-refreshes every 60 seconds
  // Returns: { data, loading, error, refresh }
}
```

#### API Aggregation
```typescript
// app/api/dashboard/route.ts
export async function GET() {
  const [stablecoins, operations, stats] = await Promise.all([
    fetch('list-client-stablecoins'),
    fetch('list-client-operations'),
    fetch('get-stablecoin-stats') // for each stablecoin
  ]);
  
  return { stablecoins, operations, statsByStablecoin };
}
```

### Responsive Design

Fountain is fully responsive with breakpoints:
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md/lg)
- **Desktop**: > 1024px (xl)

Features:
- ✅ Mobile sidebar with overlay
- ✅ Collapsible navigation
- ✅ Horizontal scroll tables
- ✅ Adaptive grid layouts
- ✅ Touch-friendly buttons

### Component Library

Built with **shadcn/ui** components:
- Tables, Badges, Buttons
- Charts (Recharts)
- Empty states (Framer Motion)
- Loading animations (3D Box Loader)

---

## 🚢 Deployment

### Frontend (Vercel)

**Live URL**: [https://app-fountain.vercel.app/](https://app-fountain.vercel.app/)

```bash
# Deploy to production
vercel --prod

# Environment variables required:
RAYLS_FUNCTIONS_BASE_URL=https://bzxdqkttnkxqaecaiekt.supabase.co/functions/v1
RAYLS_FUNCTIONS_API_KEY=your_api_key
```

### Backend (Supabase)

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy stablecoin-create

# Set secrets
supabase secrets set BLOCKCHAIN_RPC_URL=https://devnet-rpc.rayls.com
supabase secrets set FACTORY_CONTRACT_ADDRESS=0x...
supabase secrets set ASAAS_API_KEY=...
```

### Smart Contracts (Foundry)

```bash
# Deploy to Rayls Devnet
forge script script/DeployStablecoinFactory.s.sol \
  --rpc-url https://devnet-rpc.rayls.com \
  --private-key $PRIVATE_KEY \
  --broadcast
```

---

## 📚 API Documentation

### Base URL

```
Production: https://bzxdqkttnkxqaecaiekt.supabase.co/functions/v1
```

### Authentication

All requests require an API key:

```bash
-H "x-api-key: YOUR_API_KEY"
```

### Endpoints

#### Create Stablecoin

```bash
POST /stablecoin-create
Content-Type: application/json

{
  "client_name": "Acme Corp",
  "symbol": "BRL",
  "client_wallet": "0x...",
  "webhook": "https://your-app.com/webhook",
  "total_supply": 1000000
}

Response:
{
  "stablecoin_id": "uuid",
  "symbol": "BRL",
  "erc20_address": "0x...",
  "tx_hash": "0x...",
  "status": "deployed"
}
```

#### Request Deposit

```bash
POST /deposit-request
Content-Type: application/json

{
  "stablecoin_id": "uuid",
  "amount": 100
}

Response:
{
  "operation_id": "uuid",
  "qrcode_payload": "00020126...",
  "qrcode_image": "data:image/png;base64...",
  "status": "payment_pending"
}
```

#### List Stablecoins

```bash
GET /list-client-stablecoins?limit=50&offset=0

Response:
{
  "data": [
    {
      "stablecoin_id": "uuid",
      "symbol": "BRL",
      "erc20_address": "0x...",
      "status": "deployed",
      "created_at": "2025-11-19T..."
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 5,
    "has_more": false
  }
}
```

For complete API documentation, see [CLAUDE.md](back-end/CLAUDE.md)

---

## 🧪 Testing

### Integration Tests

```bash
cd back-end/tests

# Run all tests
./run-all-tests.sh

# Run specific test
./01-stablecoin-create.sh
./02-deposit-request.sh
./03-withdraw.sh
```

### Smart Contract Tests

```bash
cd back-end/web3

# Run Foundry tests
forge test

# Run with gas reporting
forge test --gas-report
```

---

## 📊 Metrics & Monitoring

### Dashboard Metrics

- **Total Volume**: Sum of all deposits + withdrawals (BRL)
- **Success Rate**: (Successful ops / Total ops) × 100
- **Active Stablecoins**: Deployed stablecoins count
- **Operations Count**: Total transactions processed

### Performance

- **API Response Time**: < 500ms (p95)
- **Dashboard Load**: < 2s (First Contentful Paint)
- **Auto-refresh**: Every 60 seconds
- **Uptime**: 99.9% SLA

---

## 🔒 Security

### Backend
- ✅ API Key authentication (SHA-256 hashed)
- ✅ Webhook signature validation (HMAC-SHA256)
- ✅ Rate limiting via Supabase
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (parameterized queries)

### Smart Contracts
- ✅ Access control (only factory can mint/burn)
- ✅ Reentrancy protection
- ✅ Integer overflow protection (Solidity 0.8+)
- ✅ Audited by [TBD]

### Frontend
- ✅ API key never exposed to browser
- ✅ HTTPS only
- ✅ XSS protection
- ✅ CSRF tokens

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙋 Support

- **Email**: hello@fountain.dev
- **Documentation**: [https://app-fountain.vercel.app/](https://app-fountain.vercel.app/)
- **Issues**: [GitHub Issues](https://github.com/your-org/fountain/issues)

---

## 🎉 Acknowledgments

- **Rayls Network** - Blockchain infrastructure
- **Supabase** - Backend platform
- **Vercel** - Frontend hosting
- **Asaas** - PIX payment processor
- **shadcn/ui** - Component library

---

Built with ❤️ by the Fountain team to accelerate real-world asset tokenization across Latin America.

**🌐 [https://app-fountain.vercel.app/](https://app-fountain.vercel.app/)**

