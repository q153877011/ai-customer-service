# AI Customer Service UI - Comprehensive Codebase Overview

## 1. PROJECT STRUCTURE

```
ai-customer-serviece/
├── app/
│   ├── api/                          # Next.js API routes (proxy to Dify)
│   │   ├── chat-messages/            # Chat message streaming endpoint
│   │   ├── conversations/            # Conversation management
│   │   ├── file-upload/              # Multimodal file upload
│   │   ├── messages/                 # Message history & feedback
│   │   ├── workflows/                # Workflow execution
│   │   ├── meta/                     # App metadata
│   │   ├── parameters/               # App parameters
│   │   └── utils/                    # Common utilities
│   ├── components/                   # React UI components
│   │   ├── customer-service/         # ⭐ Main customer service shell
│   │   │   ├── index.tsx             # CustomerServiceShell wrapper
│   │   │   ├── message-list.tsx      # Message display component
│   │   │   ├── composer.tsx          # Input area component
│   │   │   ├── session-sidebar.tsx   # Chat history sidebar
│   │   │   ├── use-customer-service.ts # Main business logic hook
│   │   │   ├── workflow-event-card.tsx # Workflow visualization
│   │   │   └── customer-service.module.css # Styling
│   │   ├── chat-generation/          # Legacy chat component
│   │   ├── cool-text-generation/     # Legacy text generation
│   │   ├── run-once/                 # Single-turn completion mode
│   │   ├── run-batch/                # Batch processing mode
│   │   ├── conversation-sidebar/     # Legacy sidebar
│   │   ├── nav-bar/                  # Top navigation bar
│   │   ├── result/                   # Result display components
│   │   ├── base/                     # Reusable UI components
│   │   └── icons/                    # Icon components
│   ├── styles/
│   │   ├── globals.css               # Global styles + Tailwind
│   │   └── markdown.scss             # Markdown rendering styles
│   ├── page.tsx                      # Main page entry point
│   ├── layout.tsx                    # Root layout
│   └── global.d.ts                   # TypeScript type declarations
├── service/
│   ├── base.ts                       # Core HTTP client (SSE streaming)
│   └── index.ts                      # API service functions
├── types/
│   └── app.ts                        # Type definitions for the app
├── utils/
│   └── detect-app-type.ts            # App type detection logic
├── hooks/
│   └── use-container-breakpoints.ts  # Responsive layout hook
├── i18n/                             # Internationalization (Chinese default)
├── config/
│   └── index.ts                      # App configuration
├── public/                           # Static assets
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript configuration
├── next.config.js                    # Next.js configuration
├── tailwind.config.js                # Tailwind CSS configuration
├── .env.example                      # Environment variables template
└── .env                              # Environment variables (populated)
```

## 2. FRAMEWORK & STACK

### Frontend Framework
- **Next.js 16.2.2** - React-based SSR/SSG framework
  - App Router (not Pages Router)
  - API Routes for backend proxy
  - Server Components with `use client` directives

### UI & Styling
- **React 19.0.0** - Core UI library
- **Tailwind CSS 3.2.7** - Utility-first CSS framework
- **CSS Modules** - Component-scoped styling
- **Heroicons 2.0.16** - SVG icon library
- **React Markdown 8.0.6** - Markdown rendering
- **KaTeX 0.16.7** - Math formula rendering
- **React Syntax Highlighter 15.5.0** - Code block highlighting

### State Management & Hooks
- **React Hooks** (built-in) - useState, useCallback, useEffect
- **use-context-selector 1.4.1** - Optimized context updates
- **ahooks 3.7.5** - Utility hooks collection
- **immer 9.0.19** - Immutable state updates

### API & HTTP
- **Dify Client 2.3.1** - Official Dify SDK
- **Fetch API** - Native browser HTTP
- **Server-Sent Events (SSE)** - Real-time streaming

### Internationalization
- **i18next 22.4.13** - Translation framework
- **react-i18next 12.2.0** - React integration
- **Default Language: Chinese (zh-Hans)**

### Developer Tools
- **TypeScript 5.7.0** - Type safety
- **ESLint 8.57.0** - Code linting
- **Husky 8.0.3** - Git hooks
- **Jest 30.3.0** - Testing framework
- **Sass 1.61.0** - CSS preprocessor

## 3. CURRENT CHAT/CUSTOMER SERVICE UI

### Visual Architecture

```
┌─────────────────────────────────────────────┐
│           HEADER (Compact / Full)           │  ← App icon + name + history button
├──────────┬──────────────────────────────────┤
│          │                                  │
│ Sidebar  │        MESSAGE LIST              │  ← User/Assistant messages
│ (History)│    - User bubbles (right)        │
│          │    - Assistant bubbles (left)    │
│          │    - Workflow cards              │
│          │    - Agent thoughts              │
├──────────┴──────────────────────────────────┤
│        COMPOSER (Input Area)                │  ← Text input + file upload + TTS/STT
│    - Suggested questions                    │
│    - File attachments preview               │
│    - Textarea + action buttons              │
└─────────────────────────────────────────────┘
```

### Component Hierarchy

**CustomerServiceShell (Main Container)**
```
CustomerServiceShell
├── useCustomerService()  ← Core business logic hook
├── <Header>
│   ├── App Icon / Placeholder
│   ├── App Name
│   └── History Button (drawer mode)
├── <SessionSidebar>
│   ├── Conversation list
│   ├── New conversation button
│   └── (Drawer mode for mobile)
├── <MessageList>
│   ├── UserBubble
│   ├── AssistantBubble
│   │   ├── Markdown content
│   │   ├── TTS button
│   │   ├── Like/Dislike feedback
│   │   └── Streaming cursor
│   ├── AgentThoughtBubble (for agent mode)
│   └── WorkflowEventCard (for workflow mode)
└── <Composer>
    ├── Suggested questions
    ├── File attachments preview
    ├── Textarea (auto-resize)
    ├── File upload button
    ├── Microphone button (STT)
    └── Send / Stop button
```

### Key Features

1. **Multi-turn Conversation**
   - Maintains conversation history via `activeSessionId`
   - Loads previous messages when switching sessions
   - Auto-generates session names

2. **Streaming Messages**
   - Real-time token streaming via SSE
   - Displays streaming cursor while generating
   - Smooth scroll to latest message

3. **Multimodal Support**
   - Image upload & preview
   - Document upload (PDF, Word, Excel, CSV, TXT)
   - Progress tracking (0-100%)
   - Error state handling

4. **Agent Support**
   - Agent thought visualization (collapsible)
   - Tool usage display
   - Streaming agent responses

5. **Workflow Support**
   - Workflow execution visualization
   - Node-by-node progress display
   - Final output rendering
   - Error tracking

6. **Feedback System**
   - Thumbs up/down for messages
   - Optional feedback content
   - Persisted via `/messages/{id}/feedbacks` API

7. **Voice Integration**
   - **TTS (Text-to-Speech)** - Play assistant responses
   - **STT (Speech-to-Text)** - Record and transcribe user input

8. **Responsive Design**
   - Full page mode (desktop)
   - Compact embed mode (small window)
   - Drawer sidebar (mobile/narrow screens)
   - Breakpoints: narrow, medium, wide

### Message Types

```typescript
type UnifiedMessage = 
  | { kind: 'user', content, attachments }           // User input
  | { kind: 'assistant', content, feedback }         // AI response
  | { kind: 'agent_thought', agentThought }          // Agent thinking
  | { kind: 'workflow_event', workflowEvent }        // Workflow progress
```

## 4. CONFIGURATION FILES

### `.env` (Environment Variables)
```bash
NEXT_PUBLIC_APP_KEY=app-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Dify application key
NEXT_PUBLIC_API_URL=https://api.dify.ai/v1        # Dify API base URL
```

### `config/index.ts`
```typescript
export const APP_ID = process.env.NEXT_PUBLIC_APP_KEY
export const API_KEY = process.env.NEXT_PUBLIC_APP_KEY
export const API_URL = process.env.NEXT_PUBLIC_API_URL
export const API_PREFIX = '/api'                    # Internal proxy prefix

// Fallback app info
export const APP_INFO: AppInfo = {
  title: 'Text Generator APP',
  description: '',
  copyright: '',
  privacy_policy: '',
  default_language: 'en',
}
```

### `package.json` (Key Dependencies)
```json
{
  "name": "webapp-text-generator",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "test": "jest",
    "lint": "eslint .",
    "fix": "eslint . --fix"
  }
}
```

### `tsconfig.json`
- Target: ES2017
- Module: ESNext
- Path alias: `@/*` → root directory

### `next.config.js`
- Ignores TypeScript build errors
- Source maps disabled in production
- Page extensions include `.md` and `.mdx`

## 5. AI CHAT IMPLEMENTATION

### AI Provider: **Dify**

Dify is an open-source LLM application platform that:
- Provides conversation management
- Handles streaming responses
- Manages workflows & agents
- Handles file uploads & processing
- Provides TTS/STT capabilities

### API Flow

**User Message → Assistant Response**

1. **Frontend**: User types in composer and clicks "Send"
2. **Frontend**: `handleSend()` → `useCustomerService()` hook
3. **Frontend**: Sends POST to `/api/chat-messages` (local proxy)
4. **Backend**: Route at `app/api/chat-messages/route.ts`
5. **Backend**: Uses `dify-client` SDK to call Dify API
6. **Backend**: Streams response via SSE
7. **Frontend**: Receives SSE events and updates UI in real-time

### Key API Endpoints

All routes proxy to Dify's `/v1/*` API:

| Endpoint | Purpose |
|----------|---------|
| `/api/chat-messages` | Send chat message (streaming) |
| `/api/chat-messages/{id}/stop` | Stop message generation |
| `/api/conversations` | List conversations |
| `/api/conversations/{id}` | Get conversation details |
| `/api/messages` | Get message history |
| `/api/messages/{id}/feedbacks` | Submit message feedback |
| `/api/messages/{id}/suggested` | Get suggested follow-up questions |
| `/api/workflows/run` | Execute workflow (streaming) |
| `/api/workflows/{id}/stop` | Stop workflow execution |
| `/api/workflows/logs` | Get workflow execution history |
| `/api/file-upload` | Upload multimodal files |
| `/api/parameters` | Get app configuration parameters |
| `/api/meta` | Get app metadata (name, icon, description) |

### Streaming Implementation

Uses **Server-Sent Events (SSE)** for real-time streaming:

```
data: {"event":"message","answer":"Hello","id":"msg123","conversation_id":"conv456"}
data: {"event":"message","answer":" there","id":"msg123","conversation_id":"conv456"}
data: {"event":"message_end","id":"msg123","conversation_id":"conv456","metadata":{...}}
data: {"event":"workflow_started","workflow_run_id":"wr789"}
data: {"event":"node_finished","data":{...}}
data: {"event":"workflow_finished","data":{...}}
```

### Dify Client SDK

Located in `service/` directory:

- **`service/base.ts`** - Low-level HTTP client with SSE parsing
- **`service/index.ts`** - High-level API functions

Key streaming handlers:
- `onData()` - Token received
- `onMessageEnd()` - Message complete
- `onAgentThought()` - Agent thinking event
- `onWorkflowStarted()` - Workflow started
- `onNodeFinished()` - Node execution complete
- `onWorkflowFinished()` - Workflow done

### Multimodal Capabilities

1. **File Upload**
   - Via XHR with progress tracking
   - Supports: images (jpeg, png, webp), PDFs, documents, CSV
   - Returns `upload_file_id` for later reference

2. **Text-to-Speech**
   - Converts assistant responses to audio
   - Endpoint: `/api/text-to-audio`
   - Returns audio Blob

3. **Speech-to-Text**
   - Records user audio via WebAudio API
   - Sends WebM/MP4 blob to `/api/audio-to-text`
   - Returns transcribed text

## 6. KEY DATA STRUCTURES

### App Types Supported
```typescript
type AppTypeValue = 'completion' | 'workflow' | 'chat' | 'agent'

- completion: Single-turn text generation
- workflow:   Multi-step workflow execution
- chat:       Multi-turn chat with history
- agent:      Chat with tool-calling and reasoning
```

### Message Types
```typescript
interface UnifiedMessage {
  id: string
  createdAt: number
  kind: 'user' | 'assistant' | 'agent_thought' | 'workflow_event'
  // type-specific fields...
}
```

### Attached Files
```typescript
interface AttachedFile {
  _id: string              // UUID for React keys
  file: File               // Browser File object
  name: string
  mimeType: string         // e.g., "image/png"
  uploadFileId: string     // Dify's upload_file_id
  progress: number         // 0-100 or -1 (error)
  previewUrl?: string      // Object URL for images
}
```

## 7. STATE MANAGEMENT

### Main Hook: `useCustomerService()`

Located in `app/components/customer-service/use-customer-service.ts`

**Returns:**
```typescript
{
  // Messages
  messages: UnifiedMessage[]
  isResponding: boolean
  
  // Input & Composition
  inputText: string
  setInputText: (v: string) => void
  attachedFiles: AttachedFile[]
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  suggestedQuestions: string[]
  
  // Sending
  handleSend: () => Promise<void>
  handleStop: () => void
  
  // Sessions
  sessions: UnifiedSession[]
  activeSessionId: string | null
  switchSession: (id: string) => void
  startNewSession: () => void
  
  // Embed UI
  embedState: EmbedUIState
  setHistoryDrawerOpen: (open: boolean) => void
  
  // Feedback
  handleFeedback: (messageId: string, feedback: Feedbacktype) => Promise<void>
  
  // TTS/STT
  ttsPlayingMessageId: string | null
  handleTts: (messageId: string, text: string) => Promise<void>
  isRecording: boolean
  handleToggleRecording: () => Promise<void>
}
```

## 8. STYLING APPROACH

### Global Styles (`app/styles/globals.css`)
- Imports customer service global classes
- Tailwind CSS integration
- CSS custom properties for theming
- Color scheme variables

### Component Styles (`*.module.css`)
- CSS Modules for scoped styling
- BEM naming convention
- `customer-service.module.css` - Main shell styles
- Responsive breakpoints built-in

### Key CSS Classes (Global)
Defined in `customer-service-global.css`:
- `.msg-*` - Message display classes
- `.composer*` - Input area classes
- `.sidebar*` - Sidebar classes
- `.wf-*` - Workflow visualization classes

## 9. PERFORMANCE OPTIMIZATIONS

1. **SSE Streaming** - Avoid buffering entire response
2. **React.FC with Memoization** - Typed functional components
3. **Turbopack** - Next.js fast bundler (dev mode)
4. **URL Object Cleanup** - Proper revocation of blob URLs
5. **Abort Controllers** - Cancellable streaming requests
6. **Lazy Loading** - Components imported dynamically where needed

## 10. SECURITY FEATURES

1. **API Proxy** - All Dify calls go through Next.js API routes (not direct)
2. **Environment Variables** - Secrets in `.env` (not exposed to frontend)
3. **Session Management** - Session cookies for user identification
4. **CORS** - Handled by Next.js proxy layer
5. **File Type Validation** - Whitelist of allowed MIME types

## 11. LOCALIZATION

- **Framework**: i18next + react-i18next
- **Default Language**: Chinese (zh-Hans)
- **User Detection**: Fetched from Dify app parameters (`default_language`)
- **Configuration**: `i18n/` directory

## 12. BUILD & DEPLOYMENT

### Development
```bash
npm run dev           # Runs on localhost:3000 with Turbopack
```

### Production Build
```bash
npm run build         # Builds to .next/
npm start            # Serves from .next/
```

### Deployment Platforms
- Vercel (recommended, native Next.js support)
- Docker (Dockerfile provided)
- Any Node.js hosting

### Deployment Notes
- Source maps disabled in production
- Build errors ignored (configured in next.config.js)
- Supports SSR and API Routes

---

## Summary

This is a modern **Next.js + React + Dify** customer service UI that provides:
- ✅ Real-time streaming chat with Dify AI backend
- ✅ Multi-turn conversations with history
- ✅ Workflow visualization
- ✅ Agent thought tracing
- ✅ Multimodal support (images, documents, audio)
- ✅ Responsive design (desktop/mobile)
- ✅ Feedback collection
- ✅ i18n localization

The architecture is clean, modular, and production-ready!

