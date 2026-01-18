# Savio Cortex

AI-powered CRM and WhatsApp communication platform for lead management, automation, and sales funnel tracking.

## Features

### Lead Inbox
- Real-time WhatsApp conversations with auto-polling
- Template messages with full parameter support
- Interactive button messages
- Media support (images, videos, documents, audio)
- 24-hour window enforcement for WhatsApp messaging policy
- Message delivery status indicators

### AI Agent
- Automated conversation handling with configurable AI agents
- Per-conversation agent toggle (enable/disable automation)
- Multiple agent types: Orchestrator, QA, Data Gathering, Qualification, Scheduling

### AI Brain
- Visual diagram of agent workflow architecture
- Prompt management and inspection
- State field visualization
- Filter prompts by agent node

### CRM Integration
- HubSpot integration for contact and deal management
- Deal stage tracking with pipeline visualization
- Contact activity timeline
- Form submission history
- Task management (create, update, complete tasks)

### Funnel Metrics
- Sales funnel visualization with volume at each stage
- Step-by-step conversion rate tracking
- Drop-off analysis between stages
- Date range filtering

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **UI**: React 19, Tailwind CSS, Radix UI components
- **State Management**: Zustand with TTL-based caching
- **Charts**: Recharts
- **Diagrams**: Mermaid.js

## Setup

### 1. Environment Variables

Create `.env.local`:

```env
CORTEX_API_URL=your_cortex_backend_url
CORTEX_API_KEY=your_api_key
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Run Development Server

```bash
yarn dev
```

Open [http://localhost:4000](http://localhost:4000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── ai/                 # AI Brain page
│   ├── ai-agent/           # AI Agent management
│   ├── api/                # API routes
│   ├── login/              # Authentication
│   ├── metrics/            # Funnel metrics
│   └── settings/           # App settings
├── components/             # React components
│   ├── ui/                 # Base UI components (shadcn/ui)
│   └── ...                 # Feature components
├── contexts/               # React contexts
├── hooks/                  # Custom hooks
├── lib/                    # Utilities and API clients
│   ├── stores/             # Zustand stores
│   └── cortex-client.ts    # Backend API client
└── types/                  # TypeScript types
```

## License

MIT
