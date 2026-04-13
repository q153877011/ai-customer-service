# Quick Start Guide

## 📋 What is This Project?

This is a **Next.js + React** customer service chatbot UI that connects to **Dify** (an LLM application platform).

**Key Capabilities:**
- 💬 Real-time streaming chat with AI
- 🔄 Multi-turn conversations with history
- 🎬 Workflow visualization
- 🤖 Agent reasoning with thought tracing
- 📎 Multimodal uploads (images, documents)
- 🎤 Voice input (Speech-to-Text)
- 🔊 Voice output (Text-to-Speech)
- 📱 Responsive design (desktop/mobile)
- 👍 Feedback collection (like/dislike)

---

## 🏗️ Architecture at a Glance

```
Browser (React Components)
    ↓ HTTP/SSE
Next.js API Routes (/api/*)
    ↓ HTTP
Dify Backend (https://api.dify.ai/v1)
    ↓
LLM (OpenAI, Claude, etc.)
```

**Three-Layer Stack:**
1. **Frontend**: React components + hooks
2. **Backend**: Next.js API routes (proxy)
3. **AI**: Dify platform (handles LLM + conversation storage)

---

## 🚀 Getting Started

### 1. Setup Environment

```bash
# Install dependencies
npm install

# Create .env.local with your Dify credentials
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_APP_KEY=your-dify-app-key
NEXT_PUBLIC_API_URL=https://api.dify.ai/v1
ENVEOF
```

**Where to get these?**
- Go to [Dify](https://dify.ai)
- Create an app (Chat, Agent, or Workflow)
- Copy the API key and URL from app settings

### 2. Run Development Server

```bash
npm run dev
# Opens at http://localhost:3000
```

### 3. Start Chatting

Click in the input area and start typing!

---

## 📂 File Structure (Most Important)

```
app/
├── components/customer-service/     ← ⭐ MAIN CHAT UI
│   ├── index.tsx                    ← Shell wrapper
│   ├── message-list.tsx             ← Message display
│   ├── composer.tsx                 ← Input area
│   ├── session-sidebar.tsx          ← Chat history
│   └── use-customer-service.ts      ← Business logic (complex!)
│
├── api/
│   ├── chat-messages/route.ts       ← Send message
│   ├── conversations/route.ts       ← Get history
│   ├── file-upload/route.ts         ← Upload files
│   └── ...
│
├── page.tsx                         ← Entry point
└── layout.tsx                       ← Root layout

service/
├── index.ts                         ← API functions
└── base.ts                          ← SSE streaming

config/
└── index.ts                         ← App configuration

types/
└── app.ts                           ← Type definitions
```

---

## 🔑 Key Components Explained

### 1. **CustomerServiceShell** (`index.tsx`)
The main container component that orchestrates everything.

**Props:**
```typescript
interface Props {
  appType: 'chat' | 'agent' | 'workflow' | 'completion'
  appParams: AppParams | null
  appName?: string
  appIcon?: string
  isEmbed?: boolean
}
```

**Renders:**
- Header (app name + icon)
- SessionSidebar (conversation history)
- MessageList (messages)
- Composer (input area)

### 2. **useCustomerService()** Hook (`use-customer-service.ts`)
The brain of the app. Manages all state and logic.

**State it manages:**
- `messages` - All messages (user + assistant)
- `isResponding` - Currently generating response
- `inputText` - User's current input
- `attachedFiles` - Uploaded files
- `activeSessionId` - Current conversation
- `sessions` - List of past conversations

**Key methods:**
- `handleSend()` - Send message to Dify
- `handleStop()` - Abort generation
- `switchSession(id)` - Load different conversation
- `addFiles(files)` - Upload files

### 3. **MessageList** (`message-list.tsx`)
Displays messages in order.

**Message Types:**
- `UserBubble` - Right-aligned user messages
- `AssistantBubble` - Left-aligned AI responses
- `AgentThoughtBubble` - Collapsible agent reasoning
- `WorkflowEventCard` - Workflow progress visualization

### 4. **Composer** (`composer.tsx`)
Input area with file upload, voice, and send button.

**Features:**
- Auto-expanding textarea
- File upload button (multimodal)
- Microphone button (STT)
- Send / Stop button
- Suggested questions

---

## 🔌 API Endpoints

All routes proxy to Dify's `/v1/*` API:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat-messages` | POST | Send message (streaming) |
| `/api/conversations` | GET | List past conversations |
| `/api/messages/{id}/feedbacks` | POST | Like/dislike message |
| `/api/file-upload` | POST | Upload file |
| `/api/workflows/run` | POST | Execute workflow |
| `/api/meta` | GET | Get app info (name, icon) |

---

## 🎨 Styling

**Two approaches:**

1. **Global Classes** (in `app/styles/globals.css`):
   - `.msg-*` - Message styling
   - `.composer*` - Input area styling
   - `.sidebar*` - History styling

2. **CSS Modules** (scoped):
   - `customer-service.module.css` - Main shell styling
   - BEM naming convention

**Responsive:**
- Desktop (≥768px): Sidebar on left
- Mobile (<768px): Sidebar as drawer

---

## 💾 How Data Flows

### Sending a Message

```
User types "Hello" and hits Enter
    ↓
Composer.onSend()
    ↓
useCustomerService.handleSend()
    ↓ Creates UserBubble, clears input
    ↓ Creates empty AssistantBubble
    ↓
POST /api/chat-messages
    ↓
app/api/chat-messages/route.ts
    ↓ Uses dify-client to call Dify
    ↓
Dify /v1/chat-messages (streaming)
    ↓ Returns SSE stream
    ↓
service/base.ts parseStream()
    ↓ Parses events
    ↓
onData(token) callback
    ↓ Appends token to AssistantBubble
    ↓
UI updates in real-time!
```

### File Upload

```
User selects file
    ↓
addFiles() → uploadFile()
    ↓ XHR POST to /api/file-upload
    ↓
app/api/file-upload/route.ts
    ↓ Uses dify-client.fileUpload()
    ↓
Dify /v1/files/upload
    ↓ Returns upload_file_id
    ↓ Store in attachedFiles state
    ↓
When user sends: Include upload_file_id
```

---

## 🛠️ Common Tasks

### Add a New Message Type

1. Add to `UnifiedMessage` in `types/app.ts`
2. Create rendering component (e.g., `YourBubble`)
3. Add case in `MessageList.tsx`
4. Handle in `use-customer-service.ts`

### Change Colors

Edit `app/styles/globals.css` CSS variables or `customer-service.module.css`

Example:
```css
/* In customer-service.module.css */
.shell {
  background: #f5f5f5;  /* Change this */
}
```

### Add New API Endpoint

1. Create file in `app/api/{name}/route.ts`
2. Export `async function POST(request)` or `GET(request)`
3. Call Dify API using `dify-client` or fetch
4. Call from frontend via `service/index.ts`

Example:
```typescript
// app/api/my-endpoint/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()
  // Call Dify or do something
  return NextResponse.json({ result: 'ok' })
}
```

Then call from frontend:
```typescript
// service/index.ts
export const myFunction = async (data: any) => {
  return post('my-endpoint', { body: data })
}
```

---

## 🐛 Debugging

### Enable Logging

Check browser DevTools Console for API responses:

```typescript
// In service/base.ts, find handleStream()
console.log('SSE Event:', bufferObj.event, bufferObj)
```

### Check API Requests

Network tab (F12) → look for `/api/*` requests

### Stop Hanging Requests

Click the Stop button or press Escape

---

## 📚 Key Technologies

| Tech | Purpose |
|------|---------|
| **Next.js 16** | React framework with API routes |
| **React 19** | UI library |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **Heroicons** | Icons |
| **dify-client** | SDK to call Dify |
| **i18next** | Translations (Chinese default) |

---

## 🚀 Production Deployment

### Build

```bash
npm run build      # Creates .next/ folder
npm start         # Runs production server
```

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
# Follow prompts, set environment variables when asked
```

### Deploy to Docker

```bash
docker build -t my-app .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_APP_KEY=xxx \
  -e NEXT_PUBLIC_API_URL=xxx \
  my-app
```

---

## ⚠️ Troubleshooting

**Problem:** "Invalid token" error
- **Solution:** Check `NEXT_PUBLIC_APP_KEY` is correct

**Problem:** Messages aren't streaming
- **Solution:** Check `NEXT_PUBLIC_API_URL` points to Dify
- Check browser Network tab for SSE response

**Problem:** File upload fails
- **Solution:** Check file size limit in Dify app settings
- Check file type is allowed (images, PDFs, docs)

**Problem:** App name/icon not showing
- **Solution:** Check app metadata in Dify dashboard
- Refresh page to reload metadata

---

## 📖 Read Next

- **[CODEBASE_OVERVIEW.md](./CODEBASE_OVERVIEW.md)** - Detailed architecture
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Data flow diagrams
- **[Dify Docs](https://docs.dify.ai)** - Official Dify documentation
- **[Next.js Docs](https://nextjs.org/docs)** - Next.js guide

---

## ✨ Tips

1. **Test locally first** before deploying
2. **Use SSE streaming** for better UX (included!)
3. **Implement error boundaries** for production
4. **Monitor token usage** - track Dify usage
5. **Cache conversation history** for better performance
6. **Add rate limiting** to prevent abuse

---

**Ready to build? Start with `npm run dev` and explore the code!** 🎉
