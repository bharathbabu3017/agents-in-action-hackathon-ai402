# AI402 Platform - Coinbase Agents in Action Hackathon

![AI402 Platform](https://img.shields.io/badge/AI402-Platform-blue?style=flat-square) ![x402 Protocol](https://img.shields.io/badge/x402-Protocol-purple?style=flat-square) ![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-green?style=flat-square)

**AI402** is a blockchain-powered platform that enables monetization of AI resources, APIs, and MCP servers through instant USDC payments using the x402 protocol on Base Sepolia.

## Overview

Transform your AI models, MCP servers, and APIs into revenue streams with crypto micropayments. Users pay as little as $0.001 USDC for individual API calls or tool usage, with payments flowing directly to your wallet.

### Key Features

- **MCP Server Monetization**: Live tool discovery and per-tool pricing
- **AI Model Hosting**: AWS Bedrock integration with Nova models
- **API Monetization**: Proxy layer for existing APIs without code changes
- **Instant Payments**: Direct USDC settlement on Base Sepolia
- **AI Agent Support**: CDP AgentKit integration for autonomous payments

## Architecture

```
┌─────────────────┐ x402 Payments   ┌─────────────────┐ HTTP Proxy  ┌─────────────────┐
│ Users/Agents    │ ←──────────────→│ AI402 Platform  │ ←─────────→ │ Your Resources  │
│                 │                 │                 │             │                 │
│ • LLM Apps      │                 │ • Payment Gate  │             │ • MCP Servers   │
│ • AI Agents     │                 │ • Tool Discovery│             │ • AI Models     │
│ • Developers    │                 │ • Proxy Layer   │             │ • Any API       │
└─────────────────┘                 └─────────────────┘             └─────────────────┘
```

## Technology Stack

**Backend**: Node.js, Express.js, MongoDB, AWS Bedrock  
**Frontend**: React 19, Tailwind CSS, x402-axios  
**Blockchain**: Base Sepolia, x402 Protocol, USDC  
**AI Agents**: CDP AgentKit integration

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- AWS credentials (for Bedrock)
- Base Sepolia wallet

### Environment Variables

**Backend** (`.env`):

```bash
MONGODB_URI=mongodb://localhost:27017/ai402
FACILITATOR_URL=https://facilitator.x402.org
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

**Frontend** (`.env`):

```bash
REACT_APP_API_BASE_URL=http://localhost:5000
```

**CDP AgentKit** (`.env`):

```bash
OPENAI_API_KEY=your_openai_key
CDP_API_KEY_ID=your_cdp_key_id
CDP_API_KEY_SECRET=your_cdp_secret
NETWORK_ID=base-sepolia
```

### Installation

```bash
# Clone repository
git clone <repository-url>
cd ai402-platform

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd "../cdp agentkit x402 flow" && npm install

# Seed database
cd backend
node scripts/seed-llm-resources.js
node scripts/seed-mcp-resources.js

# Run development servers
npm run dev  # Backend (port 5000)
npm start    # Frontend (port 3000) - from frontend directory
```

### Access Points

- **Frontend**: http://localhost:3000
- **API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## Resource Types

### 1. MCP Servers

- Live tool discovery via `tools/list`
- Per-tool pricing configuration
- JSON-RPC protocol support
- Interactive playground testing

### 2. AI Models

- AWS Bedrock Nova models (Micro, Lite, Pro)
- OpenAI-compatible chat completion API
- Per-inference pricing
- Configurable token limits

### 3. General APIs

- REST, GraphQL, webhooks support
- No code changes required
- Flexible pricing models
- Authentication passthrough

## API Endpoints

```
GET    /api/resources           # List all resources
POST   /api/resources           # Create resource
GET    /api/resources/:id       # Get resource details
PUT    /api/resources/:id       # Update resource
DELETE /api/resources/:id       # Delete resource

POST   /api/playground/chat     # Free LLM chat
GET    /api/playground/models   # Available models

ALL    /proxy/:resourceId/*     # Access monetized resource (payment required)
```

## Payment Flow

1. **Request**: Client calls `/proxy/:resourceId/endpoint`
2. **Payment Required**: Server returns 402 with x402 payment details
3. **Payment**: Client processes USDC payment via x402 protocol
4. **Verification**: Server validates payment proof
5. **Access**: Request proxied to original resource
6. **Settlement**: USDC transferred to resource owner's wallet

## Use Cases

**For Creators**:

- Monetize MCP weather/file/web scraping tools
- Host custom AI models with usage-based pricing
- Convert free APIs to paid services
- Build micro-SaaS offerings

**For Consumers**:

- AI agents that autonomously pay for services
- Pay-per-use AI features in applications
- Cost-effective AI without subscriptions
- Rapid prototyping with paid services

## Security

- Cryptographic payment verification
- Blockchain settlement confirmation
- Rate limiting and abuse protection
- Authentication token management
- CORS and input validation

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push branch: `git push origin feature/name`
5. Open Pull Request

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues
- **Community**: x402 Protocol Discord

---

**Built with x402 Protocol, Base Sepolia, and CDP AgentKit**
