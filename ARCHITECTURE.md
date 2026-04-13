# Architecture Diagram

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER BROWSER (Frontend)                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         React Components (Next.js App Router)             │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │            CustomerServiceShell                    │  │ │
│  │  │                                                     │  │ │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │  │ │
│  │  │  │ Header   │  │Messages  │  │Composer  │         │  │ │
│  │  │  └──────────┘  └──────────┘  └──────────┘         │  │ │
│  │  │  └─────────────────────────────────────────────────┘  │ │
│  │  │           useCustomerService() Hook                  │  │ │
│  │  │     (State Management + API Orchestration)          │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │         service/index.ts + base.ts                │  │ │
│  │  │  (HTTP Client with SSE Streaming Support)         │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                    HTTP/POST & SSE/GET                           │
│                              │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Next.js API Routes (/api/*)                 │ │
│  │  - /api/chat-messages → sends to Dify /v1/chat-messages  │ │
│  │  - /api/file-upload → sends to Dify /v1/files/upload     │ │
│  │  - /api/conversations → lists conversations              │ │
│  │  - /api/workflows/run → executes workflows               │ │
│  │  - etc...                                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                    HTTP Proxy via dify-client
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Dify API Server (https://api.dify.ai/v1)           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - POST /chat-messages (streaming)                       │  │
│  │  - POST /workflows/run (streaming)                       │  │
│  │  - GET /conversations                                    │  │
│  │  - POST /files/upload                                    │  │
│  │  - POST /text-to-audio (TTS)                            │  │
│  │  - POST /audio-to-text (STT)                            │  │
│  │  - GET /meta (app info)                                  │  │
│  │  - etc...                                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Backend Services:                                             │ │
│  - LLM Integration (OpenAI, Claude, etc.)                     │ │
│  - Conversation Storage (PostgreSQL/MongoDB)                 │ │
│  - Workflow Engine                                           │ │
│  - Agent Runtime                                            │ │
└─────────────────────────────────────────────────────────────────┘
```

## Component Tree

```
app/page.tsx (Server Component)
└── Main/index.tsx (Client Component)
    └── fetchAppParams() → useCustomerService()
        │
        ├── CustomerServiceShell (Client Component)
        │   │
        │   ├── Header
        │   │   ├── App Icon / Placeholder
        │   │   ├── App Name
        │   │   └── History Button (mobile)
        │   │
        │   ├── SessionSidebar (drawer on mobile)
        │   │   ├── Conversation List
        │   │   │   ├── ConversationItem[]
        │   │   │   └── New Button
        │   │   └── (Drawer Wrapper on mobile)
        │   │
        │   └── MessageList
        │       ├── UserBubble[]
        │       │   ├── Text Content
        │       │   └── Attachments
        │       │
        │       ├── AssistantBubble[]
        │       │   ├── Markdown Content
        │       │   ├── Streaming Cursor
        │       │   ├── TTS Button
        │       │   ├── Feedback (Thumbs Up/Down)
        │       │   └── Actions
        │       │
        │       ├── AgentThoughtBubble[]
        │       │   └── Collapsible Thought Details
        │       │
        │       └── WorkflowEventCard
        │           ├── Status Badge
        │           ├── Node Progress
        │           ├── Final Output
        │           └── Error Display
        │
        └── Composer
            ├── Suggested Questions
            ├── File Attachments Preview
            ├── Textarea (auto-resize)
            ├── File Upload Button
            ├── Microphone Button (STT)
            ├── Stop Button (while responding)
            └── Send Button
```

## Data Flow: Sending a Message

```
User types & clicks Send
    │
    ▼
Composer.onSend()
    │
    ▼
useCustomerService.handleSend()
    │
    ├─ Create UserBubble message
    ├─ Add to messages state
    ├─ Clear input
    ├─ Create empty AssistantBubble (streaming)
    │
    ▼
service/index.ts → sendChatMessage()
    │
    ├─ POST /api/chat-messages
    │   ├─ body: { query, conversation_id, files }
    │   ▼
    │   app/api/chat-messages/route.ts
    │   │
    │   ├─ chatClient.createChatMessage()
    │   │   (uses dify-client SDK)
    │   │
    │   ▼ (via HTTP)
    │   Dify /v1/chat-messages (streaming)
    │
    ├─ SSE Stream Parsing (base.ts)
    │   │
    │   ├─ event: "message" → onData() callback
    │   │   ├─ Append token to message content
    │   │   ├─ Update UI in real-time
    │   │   └─ Auto-scroll to bottom
    │   │
    │   ├─ event: "message_end" → onMessageEnd() callback
    │   │   ├─ Mark message as complete (isStreaming=false)
    │   │   ├─ Store difyMessageId
    │   │   ├─ Fetch suggested questions
    │   │   └─ Reload conversation list
    │   │
    │   ├─ event: "agent_thought" → onAgentThought() callback
    │   │   └─ Add AgentThoughtBubble to messages
    │   │
    │   └─ onCompleted() or onError()
    │       └─ Set isResponding = false
    │
    ▼
MessageList Re-renders with new messages
```

## Data Flow: File Upload

```
User selects file in Composer
    │
    ▼
handleFileChange()
    │
    ├─ File added to attachedFiles state
    ├─ Create preview URL for images
    │
    ▼
useCustomerService.addFiles()
    │
    ├─ uploadFile(file) → XHR upload
    │   │
    │   ├─ POST /api/file-upload
    │   │   ├─ FormData: { file, type }
    │   │   │
    │   │   ▼ (via HTTP)
    │   │   app/api/file-upload/route.ts
    │   │   │
    │   │   ├─ client.fileUpload(formData)
    │   │   │   (uses dify-client SDK)
    │   │   │
    │   │   ▼
    │   │   Dify /v1/files/upload
    │   │
    │   └─ Returns upload_file_id
    │
    ├─ Update attachedFiles[].uploadFileId
    ├─ Set progress to 100
    │
    ▼
Composer displays file preview with progress
    │
    ▼
When sending message:
    │
    ├─ Convert attachedFiles → VisionFile[]
    ├─ Include files in POST /api/chat-messages
    └─ Dify processes files with query
```

## State Management Flow

```
useCustomerService Hook
│
├─ messages: UnifiedMessage[] ←─── SSE stream updates
├─ isResponding: boolean ←────── onCompleted/onError
├─ inputText: string ←───────── Textarea onChange
├─ attachedFiles: AttachedFile[] ←─ File uploads
├─ suggestedQuestions: string[] ←── fetchSuggestedQuestions()
├─ sessions: UnifiedSession[] ←──── fetchConversations()
├─ activeSessionId: string | null ←─ switchSession()
├─ ttsPlayingMessageId: string | null ←─ handleTts()
├─ isRecording: boolean ←────── handleToggleRecording()
│
├─ Refs:
│   ├─ abortControllerRef ← cancelable requests
│   ├─ audioRef ← TTS audio playback
│   ├─ mediaRecorderRef ← STT recording
│   └─ currentTaskIdRef ← current Dify task ID
│
└─ Returns: {
    messages, isResponding, inputText, setInputText,
    attachedFiles, addFiles, removeFile, suggestedQuestions,
    handleSend, handleStop,
    sessions, activeSessionId, switchSession, startNewSession,
    embedState, setHistoryDrawerOpen,
    handleFeedback,
    ttsPlayingMessageId, handleTts,
    isRecording, handleToggleRecording
   }
```

## API Route Structure

```
app/api/
│
├── chat-messages/
│   ├── route.ts ─→ POST /api/chat-messages
│   │               Calls: dify POST /v1/chat-messages
│   │
│   └── [taskId]/
│       └── stop/
│           └── route.ts ─→ POST /api/chat-messages/{id}/stop
│                           Calls: dify POST /v1/chat-messages/{id}/stop
│
├── conversations/
│   ├── route.ts ─→ GET /api/conversations
│   │               Calls: dify GET /v1/conversations
│   │
│   └── [conversationId]/
│       ├── route.ts ─→ GET/DELETE /api/conversations/{id}
│       │
│       └── name/
│           └── route.ts ─→ POST /api/conversations/{id}/name
│
├── messages/
│   ├── route.ts ─→ GET /api/messages
│   │
│   └── [messageId]/
│       ├── feedbacks/
│       │   └── route.ts ─→ POST /api/messages/{id}/feedbacks
│       │
│       └── suggested/
│           └── route.ts ─→ GET /api/messages/{id}/suggested
│
├── workflows/
│   ├── run/
│   │   ├── route.ts ─→ POST /api/workflows/run
│   │   │
│   │   └── [id]/
│   │       └── route.ts ─→ GET /api/workflows/run/{id}
│   │
│   ├── logs/
│   │   └── route.ts ─→ GET /api/workflows/logs
│   │
│   └── [taskId]/
│       └── stop/
│           └── route.ts ─→ POST /api/workflows/{id}/stop
│
├── file-upload/
│   └── route.ts ─→ POST /api/file-upload
│                   Calls: dify POST /v1/files/upload
│
├── meta/
│   └── route.ts ─→ GET /api/meta
│                   Calls: dify GET /v1/meta
│
└── parameters/
    └── route.ts ─→ GET /api/parameters
                    Calls: dify GET /v1/parameters
```

## Environment & Configuration

```
.env (populated)
│
├─ NEXT_PUBLIC_APP_KEY
│   └─ Dify application API key
│
├─ NEXT_PUBLIC_API_URL
│   └─ Dify API base URL (e.g., https://api.dify.ai/v1)
│
└─ (Browser) Fetch requests to /api/* (internal routes)

config/index.ts
│
├─ API_KEY = NEXT_PUBLIC_APP_KEY
├─ API_URL = NEXT_PUBLIC_API_URL
├─ API_PREFIX = '/api'
│
└─ APP_INFO (fallback)
    ├─ title
    ├─ description
    ├─ copyright
    ├─ privacy_policy
    └─ default_language
```

## Message Processing Pipeline

```
Input: User Query
    │
    ▼
useCustomerService.handleSend()
    │
    ├─ Create local UserMessage
    ├─ Append to state
    ├─ POST /api/chat-messages
    │
    ▼
service/base.ts handleStream()
    │
    ├─ Parse SSE chunks (data: {JSON})
    │
    ├─ Event: "message"
    │   ├─ Decode unicode escapes
    │   ├─ Call onData(token, isFirstMessage, moreInfo)
    │   └─ Update AssistantBubble content
    │
    ├─ Event: "agent_thought"
    │   ├─ Call onAgentThought(thought)
    │   └─ Create AgentThoughtBubble
    │
    ├─ Event: "message_end"
    │   ├─ Call onMessageEnd(messageId, conversationId)
    │   ├─ Mark message complete
    │   └─ Fetch suggestedQuestions
    │
    └─ Event: Stream ends
        ├─ Call onCompleted()
        ├─ Set isResponding = false
        └─ Reload sessions
    
    ▼
Output: Updated UI with streamed content
```

## Responsive Breakpoints

```
Full Desktop (wide ≥ 768px)
│
├─ Header: Normal (14px padding)
├─ Sidebar: Permanent left panel
├─ Main: Full flex
└─ Layout: flex row

Mobile/Tablet (narrow < 768px)
│
├─ Header: Compact (10px padding)
├─ Sidebar: Drawer (hidden by default)
│   └─ History button opens drawer
├─ Main: Full width
└─ Layout: flex column

Embed Mode
│
├─ Header: Compact
├─ Sidebar: Always drawer
└─ Styling: Optimized for iframe
```

## Styling Layer

```
globals.css
│
├─ @import 'customer-service-global.css'
│   │
│   ├─ .msg-* classes (message display)
│   ├─ .composer* classes (input area)
│   ├─ .sidebar* classes (history)
│   └─ .wf-* classes (workflow)
│
├─ @tailwind directives
├─ CSS custom properties (colors, sizes)
└─ Base styles (html, body, a, etc.)

component.module.css (CSS Modules)
│
├─ customer-service.module.css
│   ├─ .shell (container)
│   ├─ .shell__header
│   ├─ .shell__body
│   ├─ .shell__main
│   └─ Modifiers: --embed, --narrow, --compact
│
└─ Scoped to component via CSS Modules
```

---

This architecture ensures:
- ✅ Clean separation of concerns (API proxy, state management, UI)
- ✅ Type-safe data flow
- ✅ Efficient streaming without blocking
- ✅ Responsive across all devices
- ✅ Scalable component hierarchy
