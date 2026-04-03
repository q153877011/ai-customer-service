# Unify Dify Customer Service UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将所有 Dify 应用类型（workflow / chat / agent）统一进一套客服会话式 UI，支持完整页与嵌入小窗两种模式，废弃旧工作台分流。

**Architecture:** 在 `app/components/customer-service/` 下新建独立模块，以"统一客服壳 + 统一 session hook"为核心，把 chat conversation 和 workflow run 映射为同一套 UI 状态模型；入口层（`app/components/index.tsx`）改为统一走客服壳；新增 `app/embed/page.tsx` 提供稳定的小窗嵌入 URL；旧 `/cool` 路由保留但重定向到统一壳，避免旧链接 404。

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · CSS Modules · i18next · ahooks · Heroicons · 现有 `service/index.ts` + `service/base.ts`

---

## 文件清单

| 路径 | 动作 | 说明 |
|------|------|------|
| `types/app.ts` | MODIFY | 新增 `UnifiedMessage`、`UnifiedSession`、`EmbedUIState`、`WorkflowEventMessage` 类型 |
| `hooks/use-container-breakpoints.ts` | CREATE | 基于 `ResizeObserver` 的容器断点 hook，替代 `window.innerWidth` |
| `app/components/customer-service/use-customer-service.ts` | CREATE | 统一 session 状态 hook：封装 chat/workflow 发送、历史、停止、嵌入模式 |
| `app/components/customer-service/message-list.tsx` | CREATE | 统一消息流渲染：用户消息、AI 回复、agent thought、workflow 卡 |
| `app/components/customer-service/workflow-event-card.tsx` | CREATE | workflow 事件卡（节点时间线 + 可展开结果摘要） |
| `app/components/customer-service/composer.tsx` | CREATE | 统一输入区：文本、停止、附件、语音、建议问题，窄宽适配 |
| `app/components/customer-service/session-sidebar.tsx` | CREATE | 统一历史面板：chat 会话 + workflow 记录，支持抽屉模式 |
| `app/components/customer-service/index.tsx` | CREATE | 统一客服壳：头部 + 布局容器，组合以上子组件 |
| `app/components/customer-service/customer-service.module.css` | CREATE | 完整页/抽屉/小窗布局与视觉样式 |
| `app/components/index.tsx` | MODIFY | 所有 appType 统一路由到 `CustomerServiceShell`，移除 `CoolTextGeneration` 分流 |
| `app/cool/page.tsx` | MODIFY | 改为渲染 `CustomerServiceShell`（保留路由，避免旧链接 404） |
| `app/embed/page.tsx` | CREATE | 嵌入专用页面，默认启用 embed 模式 |
| `i18n/lang/app.zh.ts` | MODIFY | 新增 `customerService.*` 文案 |
| `i18n/lang/app.en.ts` | MODIFY | 同步英文文案 |

---

## Task 1：扩展 types/app.ts，新增统一会话类型

**Files:**
- Modify: `types/app.ts`

- [ ] **Step 1: 在 `types/app.ts` 末尾追加新类型**

```typescript
// ────────────────────────────────────────────────
// Unified Customer Service Session types
// ────────────────────────────────────────────────

/** 统一消息类型标识 */
export type UnifiedMessageKind =
  | 'user'           // 用户输入
  | 'assistant'      // AI 文本回复（chat / agent / workflow answer）
  | 'agent_thought'  // agent 工具调用思考
  | 'workflow_event' // workflow 运行进度卡

/** 一条统一消息（消息流的基本单元） */
export type UnifiedMessage = {
  /** 客户端生成的稳定 id（uuid v4），workflow 消息复用 run_id */
  id: string
  kind: UnifiedMessageKind
  /** 文本内容（user / assistant 使用） */
  content: string
  /** True 表示该 assistant 消息仍在流式传输中 */
  isStreaming?: boolean
  /** 该消息对应的 Dify message_id（chat 模式下由 message_end 事件写入） */
  difyMessageId?: string
  /** agent_thought 详情 */
  agentThought?: AgentThought
  /** workflow 事件详情 */
  workflowEvent?: WorkflowEventMessage
  /** 用户消息附件 */
  attachments?: MessageAttachment[]
  /** 消息反馈 */
  feedback?: Feedbacktype
  /** 消息时间戳（ms） */
  createdAt: number
}

/** workflow 事件卡的数据模型 */
export type WorkflowEventMessage = {
  /** Dify workflow run id */
  runId: string
  status: WorkflowRunningStatus
  /** 已完成的节点追踪列表（运行中持续追加） */
  nodes: NodeTracing[]
  /** workflow 最终输出文本（succeeded 后写入） */
  outputText?: string
  /** 错误信息（failed 后写入） */
  error?: string
  /** 总耗时（ms，succeeded / failed 后写入） */
  elapsedMs?: number
  /** 是否展开节点详情 */
  expanded: boolean
}

/**
 * 统一 session 标识。
 * - chat / agent → sessionId = Dify conversation_id
 * - workflow      → sessionId = Dify workflow run_id（本地临时 uuid，提交前为空）
 */
export type UnifiedSession = {
  /** 对应 Dify conversation_id 或 workflow run_id */
  id: string
  /** 展示名，chat 用 Dify 对话名，workflow 用时间戳生成 */
  name: string
  /** 会话来源类型 */
  appType: 'chat' | 'agent' | 'workflow'
  createdAt: number
}

/** embed 小窗 UI 状态 */
export type EmbedUIState = {
  /** true = 以嵌入/小窗模式渲染（紧凑头部、抽屉历史、压缩按钮） */
  isEmbed: boolean
  /** 历史抽屉是否打开（embed 模式下） */
  historyDrawerOpen: boolean
}
```

- [ ] **Step 2: 提交**

```bash
cd /Users/wenyiqing/dify-ai/ai-customer-serviece
git add types/app.ts
git commit -m "feat(types): add UnifiedMessage, UnifiedSession, WorkflowEventMessage, EmbedUIState"
```

---

## Task 2：新建 use-container-breakpoints hook

**Files:**
- Create: `hooks/use-container-breakpoints.ts`

- [ ] **Step 1: 新建文件**

```typescript
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

export type ContainerSize = 'narrow' | 'medium' | 'wide'

/**
 * 用 ResizeObserver 监听目标元素宽度，返回容器尺寸档位。
 * - narrow: < 480px   （适合嵌入小窗）
 * - medium: 480–768px （平板 / 窄侧栏）
 * - wide:   > 768px   （桌面完整页）
 *
 * 相比 useBreakpoints（基于 window.innerWidth），此 hook 在 iframe
 * 和非全屏容器中不会误判。
 */
export function useContainerBreakpoints(containerRef: React.RefObject<HTMLElement | null>): ContainerSize {
  const [size, setSize] = useState<ContainerSize>('wide')

  const computeSize = useCallback((width: number): ContainerSize => {
    if (width < 480) return 'narrow'
    if (width <= 768) return 'medium'
    return 'wide'
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // 初始化一次
    setSize(computeSize(el.getBoundingClientRect().width))

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        setSize(computeSize(width))
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [containerRef, computeSize])

  return size
}
```

- [ ] **Step 2: 运行 TypeScript 检查**

```bash
cd /Users/wenyiqing/dify-ai/ai-customer-serviece
npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: 无新增错误

- [ ] **Step 3: 提交**

```bash
git add hooks/use-container-breakpoints.ts
git commit -m "feat(hooks): add useContainerBreakpoints (ResizeObserver-based)"
```

---

## Task 3：新建统一 session hook — use-customer-service.ts

**Files:**
- Create: `app/components/customer-service/use-customer-service.ts`

- [ ] **Step 1: 创建目录并新建 hook 文件**

```bash
mkdir -p /Users/wenyiqing/dify-ai/ai-customer-serviece/app/components/customer-service
```

然后创建 `app/components/customer-service/use-customer-service.ts`：

```typescript
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  sendChatMessage,
  sendWorkflowMessage,
  stopChatMessage,
  stopWorkflow,
  fetchMessages,
  fetchConversations,
  fetchWorkflowLogs,
  fetchSuggestedQuestions,
  uploadFile,
  audioToText,
  textToAudio,
  updateFeedback,
} from '@/service'
import type {
  UnifiedMessage,
  UnifiedSession,
  EmbedUIState,
  WorkflowEventMessage,
  AttachedFile,
  VisionFile,
  Feedbacktype,
} from '@/types/app'
import { WorkflowRunningStatus, MessageRole, TransferMethod } from '@/types/app'
import type { AppTypeValue } from '@/config'

export type UseCustomerServiceOptions = {
  appType: AppTypeValue
  appParams: any
  isEmbed?: boolean
  /** 初始 conversationId（从 URL 或父组件传入） */
  initialConversationId?: string | null
}

export type UseCustomerServiceReturn = {
  // ── 消息流 ──
  messages: UnifiedMessage[]
  isResponding: boolean
  // ── 输入 ──
  inputText: string
  setInputText: (v: string) => void
  attachedFiles: AttachedFile[]
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  suggestedQuestions: string[]
  // ── 发送 / 停止 ──
  handleSend: () => Promise<void>
  handleStop: () => void
  // ── 会话历史 ──
  sessions: UnifiedSession[]
  activeSessionId: string | null
  switchSession: (id: string) => void
  startNewSession: () => void
  // ── embed UI ──
  embedState: EmbedUIState
  setHistoryDrawerOpen: (open: boolean) => void
  // ── 反馈 ──
  handleFeedback: (messageId: string, feedback: Feedbacktype) => Promise<void>
  // ── TTS ──
  ttsPlayingMessageId: string | null
  handleTts: (messageId: string, text: string) => Promise<void>
  // ── STT ──
  isRecording: boolean
  handleToggleRecording: () => Promise<void>
}

/** 将 AttachedFile[] 转为 Dify 接受的 VisionFile[] */
function toVisionFiles(files: AttachedFile[]): VisionFile[] {
  return files
    .filter(f => f.uploadFileId && f.progress === 100)
    .map(f => ({
      type: f.mimeType.startsWith('image/') ? 'image' : 'document',
      transfer_method: TransferMethod.local_file,
      url: '',
      upload_file_id: f.uploadFileId,
    }))
}

const MAX_FILES = 5

export function useCustomerService({
  appType,
  appParams,
  isEmbed = false,
  initialConversationId = null,
}: UseCustomerServiceOptions): UseCustomerServiceReturn {
  // ── 消息流 ──
  const [messages, setMessages] = useState<UnifiedMessage[]>([])
  const [isResponding, setIsResponding] = useState(false)

  // ── 输入 ──
  const [inputText, setInputText] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])

  // ── 会话 ──
  const [sessions, setSessions] = useState<UnifiedSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialConversationId)

  // ── embed ──
  const [embedState, setEmbedState] = useState<EmbedUIState>({
    isEmbed,
    historyDrawerOpen: false,
  })

  // ── TTS ──
  const [ttsPlayingMessageId, setTtsPlayingMessageId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ── STT ──
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // ── abort ──
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentTaskIdRef = useRef<string | null>(null)

  // ── skip sidebar refresh when conversation created mid-stream ──
  const skipNextResetRef = useRef(false)

  // ── 加载会话历史列表 ──
  const loadSessions = useCallback(async () => {
    try {
      if (appType === 'chat' || appType === 'agent') {
        const res: any = await fetchConversations({ limit: 50 })
        const data: UnifiedSession[] = (res?.data ?? []).map((c: any) => ({
          id: c.id,
          name: c.name || '新会话',
          appType,
          createdAt: (c.created_at ?? 0) * 1000,
        }))
        setSessions(data)
      } else {
        // workflow: 加载最近运行记录
        const res: any = await fetchWorkflowLogs({ limit: 50 })
        const data: UnifiedSession[] = (res?.data ?? []).map((log: any) => ({
          id: log.id,
          name: new Date(log.created_at * 1000).toLocaleString(),
          appType: 'workflow',
          createdAt: (log.created_at ?? 0) * 1000,
        }))
        setSessions(data)
      }
    } catch {
      // 静默失败，历史不展示
    }
  }, [appType])

  // ── 切换会话 / 加载历史消息 ──
  const switchSession = useCallback(async (id: string) => {
    if (id === activeSessionId) return
    setActiveSessionId(id)
    setMessages([])
    setSuggestedQuestions([])

    if (appType === 'chat' || appType === 'agent') {
      try {
        const res: any = await fetchMessages(id)
        const loaded: UnifiedMessage[] = (res?.data ?? []).flatMap((m: any) => {
          const userMsg: UnifiedMessage = {
            id: `${m.id}-user`,
            kind: 'user',
            content: m.query ?? '',
            createdAt: (m.created_at ?? 0) * 1000,
            attachments: m.message_files?.map((f: any) => ({
              name: f.filename ?? '',
              mimeType: f.mime_type ?? '',
              previewUrl: f.url,
            })) ?? [],
          }
          const assistantMsg: UnifiedMessage = {
            id: m.id,
            kind: 'assistant',
            content: m.answer ?? '',
            difyMessageId: m.id,
            feedback: m.feedback,
            agentThought: m.agent_thoughts?.[0],
            createdAt: (m.created_at ?? 0) * 1000,
          }
          return [userMsg, assistantMsg]
        })
        setMessages(loaded)
      } catch {
        // 静默
      }
    }
    // workflow session 不加载历史消息（每次运行独立）
  }, [activeSessionId, appType])

  // ── 新建 session ──
  const startNewSession = useCallback(() => {
    setActiveSessionId(null)
    setMessages([])
    setSuggestedQuestions([])
    setAttachedFiles([])
    skipNextResetRef.current = false
  }, [])

  // ── 文件管理 ──
  const addFiles = useCallback((files: File[]) => {
    const visionEnabled = appParams?.file_upload?.enabled ?? false
    if (!visionEnabled) return

    const maxFiles: number = appParams?.file_upload?.number_limits ?? MAX_FILES
    setAttachedFiles(prev => {
      const remaining = maxFiles - prev.length
      const toAdd = files.slice(0, remaining)
      const newEntries: AttachedFile[] = toAdd.map(f => ({
        _id: uuidv4(),
        file: f,
        name: f.name,
        size: f.size,
        mimeType: f.type,
        uploadFileId: '',
        progress: 0,
        previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      }))

      // 触发上传
      newEntries.forEach(entry => {
        uploadFile(
          entry.file,
          (p) => {
            setAttachedFiles(cur =>
              cur.map(x => x._id === entry._id ? { ...x, progress: p } : x),
            )
          },
          (fileId) => {
            setAttachedFiles(cur =>
              cur.map(x => x._id === entry._id ? { ...x, uploadFileId: fileId, progress: 100 } : x),
            )
          },
          () => {
            setAttachedFiles(cur =>
              cur.map(x => x._id === entry._id ? { ...x, progress: -1 } : x),
            )
          },
        )
      })

      return [...prev, ...newEntries]
    })
  }, [appParams])

  const removeFile = useCallback((id: string) => {
    setAttachedFiles(prev => {
      const entry = prev.find(f => f._id === id)
      if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl)
      return prev.filter(f => f._id !== id)
    })
  }, [])

  // ── 发送 ──
  const handleSend = useCallback(async () => {
    const query = inputText.trim()
    if (!query || isResponding) return

    // 等待附件上传完成
    const hasUploading = attachedFiles.some(f => f.progress >= 0 && f.progress < 100)
    if (hasUploading) return

    const userMsgId = uuidv4()
    const userMsg: UnifiedMessage = {
      id: userMsgId,
      kind: 'user',
      content: query,
      createdAt: Date.now(),
      attachments: attachedFiles.map(f => ({
        name: f.name,
        mimeType: f.mimeType,
        previewUrl: f.previewUrl,
      })),
    }

    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setSuggestedQuestions([])

    const visionFiles = toVisionFiles(attachedFiles)
    setAttachedFiles([])

    setIsResponding(true)
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    if (appType === 'chat' || appType === 'agent') {
      // ── Chat / Agent 流 ──
      const assistantMsgId = uuidv4()
      const assistantMsg: UnifiedMessage = {
        id: assistantMsgId,
        kind: 'assistant',
        content: '',
        isStreaming: true,
        createdAt: Date.now(),
      }
      setMessages(prev => [...prev, assistantMsg])

      await sendChatMessage(
        {
          query,
          inputs: appParams?.user_input_form ? {} : undefined,
          conversation_id: activeSessionId ?? undefined,
          files: visionFiles.length > 0 ? visionFiles : undefined,
        },
        {
          abortController,
          onTaskId: (taskId) => { currentTaskIdRef.current = taskId },
          onData: (token, isFirst, more) => {
            if (isFirst && more?.conversation_id && !activeSessionId) {
              skipNextResetRef.current = true
              setActiveSessionId(more.conversation_id)
            }
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + token }
                  : m,
              ),
            )
          },
          onMessageEnd: (msgEnd) => {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, isStreaming: false, difyMessageId: msgEnd.id }
                  : m,
              ),
            )
            // 加载建议问题
            if (msgEnd.id && appParams?.suggested_questions_after_answer?.enabled) {
              fetchSuggestedQuestions(msgEnd.id)
                .then((res: any) => setSuggestedQuestions(res?.data ?? []))
                .catch(() => {})
            }
          },
          onAgentThought: (thought) => {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, agentThought: thought }
                  : m,
              ),
            )
          },
          onCompleted: () => {
            setIsResponding(false)
            if (!skipNextResetRef.current)
              loadSessions()
            else
              skipNextResetRef.current = false
          },
          onError: () => {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, isStreaming: false, content: m.content || '[请求失败，请重试]' }
                  : m,
              ),
            )
            setIsResponding(false)
          },
        },
      )
    } else {
      // ── Workflow 流 ──
      const wfMsgId = uuidv4()
      const wfMsg: UnifiedMessage = {
        id: wfMsgId,
        kind: 'workflow_event',
        content: '',
        isStreaming: true,
        createdAt: Date.now(),
        workflowEvent: {
          runId: wfMsgId,
          status: WorkflowRunningStatus.Waiting,
          nodes: [],
          expanded: false,
        },
      }
      setMessages(prev => [...prev, wfMsg])

      const updateWfEvent = (updater: (prev: WorkflowEventMessage) => WorkflowEventMessage) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === wfMsgId && m.workflowEvent
              ? { ...m, workflowEvent: updater(m.workflowEvent) }
              : m,
          ),
        )
      }

      await sendWorkflowMessage(
        {
          inputs: appParams?.user_input_form
            ? { query }
            : { query },
          files: visionFiles.length > 0 ? visionFiles : undefined,
        },
        {
          abortController,
          onTaskId: (taskId) => { currentTaskIdRef.current = taskId },
          onWorkflowStarted: (data) => {
            updateWfEvent(ev => ({
              ...ev,
              runId: data.workflow_run_id ?? ev.runId,
              status: WorkflowRunningStatus.Running,
            }))
          },
          onNodeStarted: (data) => {
            // 节点开始时不追加，等 finished 再追加
          },
          onNodeFinished: (data) => {
            updateWfEvent(ev => ({
              ...ev,
              nodes: [
                ...ev.nodes,
                {
                  id: data.id ?? uuidv4(),
                  index: ev.nodes.length,
                  predecessor_node_id: '',
                  node_id: data.node_id ?? '',
                  node_type: data.node_type as any,
                  title: data.title ?? data.node_type ?? '',
                  inputs: data.inputs,
                  process_data: null,
                  outputs: data.outputs,
                  status: data.status ?? 'succeeded',
                  error: data.error,
                  elapsed_time: data.elapsed_time ?? 0,
                  execution_metadata: data.execution_metadata ?? { total_tokens: 0, total_price: 0, currency: '' },
                  created_at: Date.now() / 1000,
                  created_by: { id: '', name: '', email: '' },
                  finished_at: Date.now() / 1000,
                  expand: false,
                },
              ],
            }))
          },
          onWorkflowFinished: (data) => {
            const outputText = data.data?.outputs
              ? (typeof data.data.outputs === 'string'
                  ? data.data.outputs
                  : (data.data.outputs.text ?? data.data.outputs.answer ?? JSON.stringify(data.data.outputs)))
              : ''

            updateWfEvent(ev => ({
              ...ev,
              status: data.data?.status === 'succeeded'
                ? WorkflowRunningStatus.Succeeded
                : WorkflowRunningStatus.Failed,
              outputText,
              error: data.data?.error,
              elapsedMs: data.data?.elapsed_time ? Math.round(data.data.elapsed_time * 1000) : undefined,
            }))

            // 把 workflow 输出追加为 assistant 消息方便阅读
            if (outputText) {
              const answerMsg: UnifiedMessage = {
                id: uuidv4(),
                kind: 'assistant',
                content: outputText,
                isStreaming: false,
                createdAt: Date.now(),
              }
              setMessages(prev => [...prev, answerMsg])
            }

            setMessages(prev =>
              prev.map(m => m.id === wfMsgId ? { ...m, isStreaming: false } : m),
            )
            setIsResponding(false)
            loadSessions()
          },
        },
      )
    }
  }, [inputText, isResponding, attachedFiles, appType, appParams, activeSessionId, loadSessions])

  // ── 停止 ──
  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
    if (currentTaskIdRef.current) {
      if (appType === 'chat' || appType === 'agent')
        stopChatMessage(currentTaskIdRef.current).catch(() => {})
      else
        stopWorkflow(currentTaskIdRef.current).catch(() => {})
      currentTaskIdRef.current = null
    }
    setIsResponding(false)
    setMessages(prev =>
      prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m),
    )
  }, [appType])

  // ── 反馈 ──
  const handleFeedback = useCallback(async (messageId: string, feedback: Feedbacktype) => {
    await updateFeedback({ url: `messages/${messageId}/feedbacks`, body: feedback })
    setMessages(prev =>
      prev.map(m => m.difyMessageId === messageId ? { ...m, feedback } : m),
    )
  }, [])

  // ── TTS ──
  const handleTts = useCallback(async (messageId: string, text: string) => {
    if (ttsPlayingMessageId === messageId) {
      audioRef.current?.pause()
      setTtsPlayingMessageId(null)
      return
    }
    try {
      const blob = await textToAudio(text, messageId)
      const url = URL.createObjectURL(blob)
      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }
      const audio = new Audio(url)
      audioRef.current = audio
      setTtsPlayingMessageId(messageId)
      audio.onended = () => setTtsPlayingMessageId(null)
      audio.play()
    } catch {
      setTtsPlayingMessageId(null)
    }
  }, [ttsPlayingMessageId])

  // ── STT ──
  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = e => { audioChunksRef.current.push(e.data) }
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        try {
          const text = await audioToText(blob)
          if (text) setInputText(prev => prev + (prev ? ' ' : '') + text)
        } catch {
          // 静默
        }
      }
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      // 用户拒绝麦克风
    }
  }, [isRecording])

  // ── embed 历史抽屉 ──
  const setHistoryDrawerOpen = useCallback((open: boolean) => {
    setEmbedState(prev => ({ ...prev, historyDrawerOpen: open }))
  }, [])

  // ── 初始化 ──
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // ── 卸载清理 ──
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      audioRef.current?.pause()
      attachedFiles.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    messages,
    isResponding,
    inputText,
    setInputText,
    attachedFiles,
    addFiles,
    removeFile,
    suggestedQuestions,
    handleSend,
    handleStop,
    sessions,
    activeSessionId,
    switchSession,
    startNewSession,
    embedState,
    setHistoryDrawerOpen,
    handleFeedback,
    ttsPlayingMessageId,
    handleTts,
    isRecording,
    handleToggleRecording,
  }
}
```

- [ ] **Step 2: TypeScript 检查**

```bash
cd /Users/wenyiqing/dify-ai/ai-customer-serviece
npx tsc --noEmit 2>&1 | head -40
```

Expected: 无新增错误（可能有 workflow 事件参数形状的轻微告警，需逐一修正）

- [ ] **Step 3: 提交**

```bash
git add app/components/customer-service/use-customer-service.ts
git commit -m "feat(hook): add useCustomerService — unified chat/workflow session hook"
```

---

## Task 4：新建 WorkflowEventCard 组件

**Files:**
- Create: `app/components/customer-service/workflow-event-card.tsx`

- [ ] **Step 1: 创建文件**

```tsx
'use client'
import React, { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import type { WorkflowEventMessage } from '@/types/app'
import { WorkflowRunningStatus, BlockEnum } from '@/types/app'
import ReactMarkdown from 'react-markdown'

type Props = {
  event: WorkflowEventMessage
}

const STATUS_LABEL: Record<WorkflowRunningStatus, string> = {
  [WorkflowRunningStatus.Waiting]: '等待中',
  [WorkflowRunningStatus.Running]: '运行中…',
  [WorkflowRunningStatus.Succeeded]: '已完成',
  [WorkflowRunningStatus.Failed]: '运行失败',
  [WorkflowRunningStatus.Stopped]: '已停止',
}

const NODE_TYPE_LABEL: Partial<Record<BlockEnum, string>> = {
  [BlockEnum.Start]: '开始',
  [BlockEnum.End]: '结束',
  [BlockEnum.Answer]: '输出',
  [BlockEnum.LLM]: 'LLM',
  [BlockEnum.KnowledgeRetrieval]: '知识检索',
  [BlockEnum.QuestionClassifier]: '问题分类',
  [BlockEnum.IfElse]: '条件分支',
  [BlockEnum.Code]: '代码',
  [BlockEnum.HttpRequest]: 'HTTP 请求',
  [BlockEnum.Tool]: '工具',
}

export const WorkflowEventCard: React.FC<Props> = ({ event }) => {
  const [expanded, setExpanded] = useState(event.expanded)
  const isRunning = event.status === WorkflowRunningStatus.Running || event.status === WorkflowRunningStatus.Waiting
  const isSuccess = event.status === WorkflowRunningStatus.Succeeded
  const isFailed = event.status === WorkflowRunningStatus.Failed || event.status === WorkflowRunningStatus.Stopped

  return (
    <div className="wf-card">
      {/* 顶部状态条 */}
      <div className={`wf-card__header wf-card__header--${event.status}`}>
        <span className="wf-card__status-icon">
          {isSuccess && <CheckCircleIcon className="wf-icon wf-icon--success" />}
          {isFailed && <XCircleIcon className="wf-icon wf-icon--error" />}
          {isRunning && <ClockIcon className="wf-icon wf-icon--running wf-spin" />}
        </span>
        <span className="wf-card__status-label">{STATUS_LABEL[event.status]}</span>
        {event.elapsedMs !== undefined && (
          <span className="wf-card__elapsed">{(event.elapsedMs / 1000).toFixed(2)}s</span>
        )}
        {event.nodes.length > 0 && (
          <button
            className="wf-card__toggle"
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? '收起节点详情' : '展开节点详情'}
          >
            {expanded
              ? <ChevronDownIcon className="wf-icon" />
              : <ChevronRightIcon className="wf-icon" />}
            <span>{event.nodes.length} 个节点</span>
          </button>
        )}
      </div>

      {/* 节点时间线 */}
      {expanded && event.nodes.length > 0 && (
        <div className="wf-card__timeline">
          {event.nodes.map((node, idx) => (
            <div key={node.id ?? idx} className={`wf-node wf-node--${node.status}`}>
              <div className="wf-node__dot" />
              <div className="wf-node__body">
                <span className="wf-node__title">
                  {NODE_TYPE_LABEL[node.node_type as BlockEnum] ?? node.node_type}
                  {node.title && node.title !== node.node_type ? ` · ${node.title}` : ''}
                </span>
                <span className="wf-node__time">{node.elapsed_time.toFixed(2)}s</span>
                {node.error && (
                  <p className="wf-node__error">{node.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 错误详情 */}
      {isFailed && event.error && (
        <div className="wf-card__error-detail">
          <p>{event.error}</p>
        </div>
      )}
    </div>
  )
}

export default WorkflowEventCard
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 无新增错误

- [ ] **Step 3: 提交**

```bash
git add app/components/customer-service/workflow-event-card.tsx
git commit -m "feat(ui): add WorkflowEventCard with node timeline and status display"
```

---

## Task 5：新建 MessageList 组件

**Files:**
- Create: `app/components/customer-service/message-list.tsx`

- [ ] **Step 1: 创建文件**

```tsx
'use client'
import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { HandThumbUpIcon, HandThumbDownIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
import type { UnifiedMessage, Feedbacktype } from '@/types/app'
import WorkflowEventCard from './workflow-event-card'

type Props = {
  messages: UnifiedMessage[]
  appName?: string
  appIcon?: string
  ttsEnabled?: boolean
  ttsPlayingMessageId: string | null
  onTts: (messageId: string, text: string) => void
  onFeedback: (messageId: string, feedback: Feedbacktype) => void
}

const UserBubble: React.FC<{ msg: UnifiedMessage }> = ({ msg }) => (
  <div className="msg-row msg-row--user">
    <div className="msg-bubble msg-bubble--user">
      <p className="msg-bubble__text">{msg.content}</p>
      {msg.attachments && msg.attachments.length > 0 && (
        <div className="msg-attachments">
          {msg.attachments.map((att, i) => (
            att.previewUrl && att.mimeType.startsWith('image/')
              ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={att.previewUrl} alt={att.name} className="msg-attachment-img" />
                )
              : (
                  <span key={i} className="msg-attachment-doc">{att.name}</span>
                )
          ))}
        </div>
      )}
    </div>
  </div>
)

const AssistantBubble: React.FC<{
  msg: UnifiedMessage
  appName?: string
  appIcon?: string
  ttsEnabled?: boolean
  ttsPlaying: boolean
  onTts: () => void
  onFeedback: (f: Feedbacktype) => void
}> = ({ msg, appName, appIcon, ttsEnabled, ttsPlaying, onTts, onFeedback }) => (
  <div className="msg-row msg-row--assistant">
    <div className="msg-avatar">
      {appIcon
        ? <img src={appIcon} alt={appName} className="msg-avatar__img" />
        : <span className="msg-avatar__initial">{appName?.[0] ?? 'A'}</span>}
    </div>
    <div className="msg-bubble msg-bubble--assistant">
      {/* agent thought */}
      {msg.agentThought?.thought && (
        <details className="msg-thought">
          <summary>查看思考过程</summary>
          <p>{msg.agentThought.thought}</p>
          {msg.agentThought.tool && (
            <p className="msg-thought__tool">工具：{msg.agentThought.tool}</p>
          )}
        </details>
      )}
      {/* 正文 */}
      <div className="msg-bubble__markdown">
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
      {/* 流式光标 */}
      {msg.isStreaming && <span className="msg-cursor" aria-hidden="true" />}
      {/* 操作栏 */}
      {!msg.isStreaming && msg.difyMessageId && (
        <div className="msg-actions">
          {ttsEnabled && (
            <button
              className={`msg-action-btn ${ttsPlaying ? 'msg-action-btn--active' : ''}`}
              onClick={onTts}
              title={ttsPlaying ? '停止朗读' : '朗读'}
            >
              <SpeakerWaveIcon className="msg-action-icon" />
            </button>
          )}
          <button
            className={`msg-action-btn ${msg.feedback?.rating === 'like' ? 'msg-action-btn--active' : ''}`}
            onClick={() => onFeedback({ rating: msg.feedback?.rating === 'like' ? null : 'like' })}
            title="有帮助"
          >
            <HandThumbUpIcon className="msg-action-icon" />
          </button>
          <button
            className={`msg-action-btn ${msg.feedback?.rating === 'dislike' ? 'msg-action-btn--active' : ''}`}
            onClick={() => onFeedback({ rating: msg.feedback?.rating === 'dislike' ? null : 'dislike' })}
            title="无帮助"
          >
            <HandThumbDownIcon className="msg-action-icon" />
          </button>
        </div>
      )}
    </div>
  </div>
)

export const MessageList: React.FC<Props> = ({
  messages,
  appName,
  appIcon,
  ttsEnabled,
  ttsPlayingMessageId,
  onTts,
  onFeedback,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="msg-empty">
        <p>有什么可以帮您？</p>
      </div>
    )
  }

  return (
    <div className="msg-list" role="log" aria-live="polite">
      {messages.map(msg => {
        if (msg.kind === 'user') return <UserBubble key={msg.id} msg={msg} />
        if (msg.kind === 'workflow_event' && msg.workflowEvent)
          return <WorkflowEventCard key={msg.id} event={msg.workflowEvent} />
        return (
          <AssistantBubble
            key={msg.id}
            msg={msg}
            appName={appName}
            appIcon={appIcon}
            ttsEnabled={ttsEnabled}
            ttsPlaying={ttsPlayingMessageId === msg.difyMessageId}
            onTts={() => msg.difyMessageId && onTts(msg.difyMessageId, msg.content)}
            onFeedback={f => msg.difyMessageId && onFeedback(msg.difyMessageId, f)}
          />
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

export default MessageList
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add app/components/customer-service/message-list.tsx
git commit -m "feat(ui): add MessageList — unified user/assistant/workflow message renderer"
```

---

## Task 6：新建 Composer 组件

**Files:**
- Create: `app/components/customer-service/composer.tsx`

- [ ] **Step 1: 创建文件**

```tsx
'use client'
import React, { useRef, useEffect, KeyboardEvent } from 'react'
import {
  PaperAirplaneIcon,
  StopIcon,
  PaperClipIcon,
  MicrophoneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { AttachedFile } from '@/types/app'

type Props = {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onStop: () => void
  isResponding: boolean
  // 附件
  attachedFiles: AttachedFile[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (id: string) => void
  fileUploadEnabled: boolean
  // 语音
  sttEnabled: boolean
  isRecording: boolean
  onToggleRecording: () => void
  // 建议问题
  suggestedQuestions: string[]
  // 布局
  isNarrow?: boolean
  placeholder?: string
}

export const Composer: React.FC<Props> = ({
  value,
  onChange,
  onSend,
  onStop,
  isResponding,
  attachedFiles,
  onAddFiles,
  onRemoveFile,
  fileUploadEnabled,
  sttEnabled,
  isRecording,
  onToggleRecording,
  suggestedQuestions,
  isNarrow = false,
  placeholder = '请输入您的问题…',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 自动调整 textarea 高度
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isResponding) onSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onAddFiles(files)
    e.target.value = ''
  }

  const canSend = value.trim().length > 0 && !isResponding
    && !attachedFiles.some(f => f.progress >= 0 && f.progress < 100)

  return (
    <div className={`composer ${isNarrow ? 'composer--narrow' : ''}`}>
      {/* 建议问题 */}
      {suggestedQuestions.length > 0 && !isResponding && (
        <div className="composer__suggestions">
          {suggestedQuestions.map((q, i) => (
            <button key={i} className="composer__suggestion-chip" onClick={() => onChange(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 附件预览条 */}
      {attachedFiles.length > 0 && (
        <div className="composer__attachments">
          {attachedFiles.map(f => (
            <div key={f._id} className={`composer__attachment ${f.progress === -1 ? 'composer__attachment--error' : ''}`}>
              {f.previewUrl
                ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.previewUrl} alt={f.name} className="composer__attachment-thumb" />
                  )
                : (
                    <span className="composer__attachment-name">{f.name}</span>
                  )}
              {f.progress >= 0 && f.progress < 100 && (
                <div
                  className="composer__attachment-progress"
                  style={{ width: `${f.progress}%` }}
                />
              )}
              <button
                className="composer__attachment-remove"
                onClick={() => onRemoveFile(f._id)}
                aria-label={`移除 ${f.name}`}
              >
                <XMarkIcon className="composer__icon composer__icon--sm" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 主输入行 */}
      <div className="composer__row">
        <textarea
          ref={textareaRef}
          className="composer__textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isResponding}
          aria-label="消息输入框"
        />

        <div className="composer__actions">
          {/* 附件按钮 */}
          {fileUploadEnabled && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={handleFileChange}
                accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx"
              />
              <button
                className="composer__btn"
                onClick={() => fileInputRef.current?.click()}
                title="上传附件"
                disabled={isResponding}
              >
                <PaperClipIcon className="composer__icon" />
              </button>
            </>
          )}

          {/* 语音按钮 */}
          {sttEnabled && (
            <button
              className={`composer__btn ${isRecording ? 'composer__btn--recording' : ''}`}
              onClick={onToggleRecording}
              title={isRecording ? '停止录音' : '语音输入'}
              disabled={isResponding && !isRecording}
            >
              <MicrophoneIcon className="composer__icon" />
            </button>
          )}

          {/* 停止 / 发送 */}
          {isResponding
            ? (
                <button className="composer__btn composer__btn--stop" onClick={onStop} title="停止生成">
                  <StopIcon className="composer__icon" />
                </button>
              )
            : (
                <button
                  className={`composer__btn composer__btn--send ${canSend ? 'composer__btn--send-active' : ''}`}
                  onClick={onSend}
                  disabled={!canSend}
                  title="发送（Enter）"
                >
                  <PaperAirplaneIcon className="composer__icon" />
                </button>
              )}
        </div>
      </div>
    </div>
  )
}

export default Composer
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add app/components/customer-service/composer.tsx
git commit -m "feat(ui): add Composer — unified input area with attachments, STT, stop"
```

---

## Task 7：新建 SessionSidebar 组件

**Files:**
- Create: `app/components/customer-service/session-sidebar.tsx`

- [ ] **Step 1: 创建文件**

```tsx
'use client'
import React from 'react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { UnifiedSession } from '@/types/app'

type Props = {
  sessions: UnifiedSession[]
  activeSessionId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  /** true = 以抽屉模式渲染（小窗 / 窄宽容器） */
  drawerMode: boolean
  drawerOpen: boolean
  onCloseDrawer: () => void
  appName?: string
}

const SessionItem: React.FC<{
  session: UnifiedSession
  isActive: boolean
  onSelect: () => void
}> = ({ session, isActive, onSelect }) => {
  const date = new Date(session.createdAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <button
      className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
      onClick={onSelect}
    >
      <span className="sidebar__item-name">{session.name}</span>
      <span className="sidebar__item-date">{date}</span>
    </button>
  )
}

export const SessionSidebar: React.FC<Props> = ({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  drawerMode,
  drawerOpen,
  onCloseDrawer,
  appName,
}) => {
  const content = (
    <div className="sidebar">
      {/* 头部 */}
      <div className="sidebar__header">
        <span className="sidebar__title">{appName ? `${appName} · 历史` : '历史记录'}</span>
        <div className="sidebar__header-actions">
          <button className="sidebar__new-btn" onClick={onNew} title="新建会话">
            <PlusIcon className="sidebar__icon" />
          </button>
          {drawerMode && (
            <button className="sidebar__close-btn" onClick={onCloseDrawer} title="关闭">
              <XMarkIcon className="sidebar__icon" />
            </button>
          )}
        </div>
      </div>

      {/* 会话列表 */}
      <div className="sidebar__list">
        {sessions.length === 0
          ? (
              <p className="sidebar__empty">暂无历史记录</p>
            )
          : sessions.map(s => (
              <SessionItem
                key={s.id}
                session={s}
                isActive={s.id === activeSessionId}
                onSelect={() => onSelect(s.id)}
              />
            ))}
      </div>
    </div>
  )

  if (!drawerMode) return content

  // 抽屉模式：叠加在内容上
  return (
    <>
      {/* 遮罩 */}
      {drawerOpen && (
        <div className="sidebar-overlay" onClick={onCloseDrawer} aria-hidden="true" />
      )}
      <div className={`sidebar-drawer ${drawerOpen ? 'sidebar-drawer--open' : ''}`} role="complementary" aria-label="历史记录">
        {content}
      </div>
    </>
  )
}

export default SessionSidebar
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add app/components/customer-service/session-sidebar.tsx
git commit -m "feat(ui): add SessionSidebar with drawer mode support"
```

---

## Task 8：新建 CSS 样式文件

**Files:**
- Create: `app/components/customer-service/customer-service.module.css`

- [ ] **Step 1: 创建文件**

```css
/* ═══════════════════════════════════════════════════
   客服壳 — 完整页 / 嵌入小窗 统一样式
   色彩变量继承自 globals.css / Tailwind，
   局部覆盖用 CSS 自定义属性。
═══════════════════════════════════════════════════ */

/* ── 壳容器 ──────────────────────────────────────── */
.shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #FFFEFA;
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
  position: relative;
}

/* 完整页布局：侧栏 + 主区横向排列 */
.shell__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 主内容区 */
.shell__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* ── 头部 ──────────────────────────────────────── */
.shell__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: #FFFEFA;
  border-bottom: 1px solid #F0EDE8;
  flex-shrink: 0;
}

.shell__header--compact {
  padding: 10px 16px;
}

.shell__app-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  object-fit: cover;
}

.shell__app-icon-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #C8754A;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.shell__app-name {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shell__header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #5C564E;
  transition: background 0.15s;
}

.shell__header-btn:hover {
  background: #F6F3EE;
  color: #1A1A1A;
}

.shell__header-icon {
  width: 18px;
  height: 18px;
}

/* ── 消息列表 ──────────────────────────────────── */
.msg-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-behavior: smooth;
}

.msg-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #B0A89E;
  font-size: 14px;
}

/* 消息行 */
.msg-row {
  display: flex;
  gap: 10px;
}

.msg-row--user {
  justify-content: flex-end;
}

.msg-row--assistant {
  justify-content: flex-start;
}

/* 用户气泡 */
.msg-bubble--user {
  background: #C8754A;
  color: #fff;
  border-radius: 16px 16px 4px 16px;
  padding: 10px 14px;
  max-width: 72%;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.msg-bubble__text {
  margin: 0;
  white-space: pre-wrap;
}

/* AI 气泡 */
.msg-bubble--assistant {
  flex: 1;
  max-width: calc(100% - 48px);
}

.msg-bubble__markdown {
  font-size: 14px;
  line-height: 1.7;
  color: #1A1A1A;
}

.msg-bubble__markdown p { margin: 0 0 8px; }
.msg-bubble__markdown p:last-child { margin-bottom: 0; }
.msg-bubble__markdown code {
  background: #F6F3EE;
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 13px;
}
.msg-bubble__markdown pre {
  background: #F6F3EE;
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
}

/* 流式光标 */
.msg-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: #C8754A;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: cursor-blink 0.8s step-end infinite;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* agent thought */
.msg-thought {
  background: #FAF8F5;
  border: 1px solid #F0EDE8;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 10px;
  font-size: 13px;
  color: #5C564E;
}

.msg-thought summary {
  cursor: pointer;
  color: #9A6C2E;
  font-weight: 500;
}

.msg-thought__tool {
  margin: 4px 0 0;
  font-size: 12px;
  color: #B0A89E;
}

/* 操作按钮 */
.msg-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.msg-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #F0EDE8;
  background: #FFFEFA;
  cursor: pointer;
  color: #B0A89E;
  transition: all 0.15s;
}

.msg-action-btn:hover {
  border-color: #C8754A;
  color: #C8754A;
}

.msg-action-btn--active {
  border-color: #C8754A;
  color: #C8754A;
  background: #F1E2D8;
}

.msg-action-icon { width: 14px; height: 14px; }

/* 附件 */
.msg-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.msg-attachment-img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 6px;
}

.msg-attachment-doc {
  background: rgba(255,255,255,0.25);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
}

/* 头像 */
.msg-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
}

.msg-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.msg-avatar__initial {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F1E2D8;
  color: #C8754A;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
}

/* ── workflow 卡 ──────────────────────────────── */
.wf-card {
  background: #FAF8F5;
  border: 1px solid #F0EDE8;
  border-radius: 12px;
  overflow: hidden;
  max-width: 100%;
}

.wf-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
}

.wf-card__header--running,
.wf-card__header--waiting {
  background: #FFF8E8;
  color: #9A6C2E;
}

.wf-card__header--succeeded {
  background: #F0FAF4;
  color: #2A7D4B;
}

.wf-card__header--failed,
.wf-card__header--stopped {
  background: #FFF0EE;
  color: #C53A2A;
}

.wf-icon { width: 16px; height: 16px; }
.wf-icon--success { color: #2A7D4B; }
.wf-icon--error { color: #C53A2A; }
.wf-icon--running { color: #9A6C2E; }
.wf-spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.wf-card__status-icon { display: flex; align-items: center; }
.wf-card__status-label { flex: 1; }

.wf-card__elapsed {
  font-size: 12px;
  color: #B0A89E;
}

.wf-card__toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #5C564E;
  padding: 2px 6px;
  border-radius: 6px;
}

.wf-card__toggle:hover { background: rgba(0,0,0,0.05); }

.wf-card__timeline {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wf-node {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 12px;
}

.wf-node__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #B0A89E;
  flex-shrink: 0;
  margin-top: 4px;
}

.wf-node--succeeded .wf-node__dot { background: #2A7D4B; }
.wf-node--failed .wf-node__dot { background: #C53A2A; }
.wf-node--running .wf-node__dot { background: #C8754A; }

.wf-node__body { flex: 1; }

.wf-node__title {
  color: #1A1A1A;
  font-weight: 500;
}

.wf-node__time {
  color: #B0A89E;
  margin-left: 8px;
}

.wf-node__error {
  color: #C53A2A;
  margin: 4px 0 0;
  font-size: 11px;
}

.wf-card__error-detail {
  padding: 8px 14px 12px;
  font-size: 12px;
  color: #C53A2A;
  background: #FFF0EE;
}

/* ── 输入区（Composer）──────────────────────────── */
.composer {
  border-top: 1px solid #F0EDE8;
  padding: 12px 16px;
  background: #FFFEFA;
  flex-shrink: 0;
}

.composer--narrow {
  padding: 8px 12px;
}

.composer__suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.composer__suggestion-chip {
  background: #F6F3EE;
  border: 1px solid #E8E3DC;
  border-radius: 100px;
  padding: 4px 12px;
  font-size: 12px;
  color: #5C564E;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  overflow: hidden;
  max-width: 200px;
  text-overflow: ellipsis;
}

.composer__suggestion-chip:hover {
  border-color: #C8754A;
  color: #C8754A;
  background: #F1E2D8;
}

.composer__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.composer__attachment {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #F0EDE8;
  background: #F6F3EE;
  display: flex;
  align-items: center;
  justify-content: center;
}

.composer__attachment--error {
  border-color: #C53A2A;
}

.composer__attachment-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.composer__attachment-name {
  font-size: 10px;
  color: #5C564E;
  padding: 4px;
  word-break: break-all;
  line-height: 1.3;
  text-align: center;
}

.composer__attachment-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: #C8754A;
  transition: width 0.2s;
}

.composer__attachment-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.composer__row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: #F6F3EE;
  border-radius: 12px;
  padding: 8px 10px 8px 14px;
}

.composer__textarea {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  resize: none;
  font-size: 14px;
  line-height: 1.6;
  color: #1A1A1A;
  min-height: 24px;
  max-height: 160px;
  overflow-y: auto;
  font-family: inherit;
}

.composer__textarea::placeholder { color: #B0A89E; }
.composer__textarea:disabled { opacity: 0.5; }

.composer__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.composer__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #B0A89E;
  transition: all 0.15s;
}

.composer__btn:hover:not(:disabled) { color: #5C564E; background: rgba(0,0,0,0.06); }
.composer__btn:disabled { opacity: 0.4; cursor: not-allowed; }

.composer__btn--recording { color: #C53A2A; animation: pulse 1s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.composer__btn--stop { color: #C53A2A; }
.composer__btn--stop:hover { background: #FFF0EE; }

.composer__btn--send { color: #B0A89E; }
.composer__btn--send-active { color: #C8754A !important; }
.composer__btn--send-active:hover { background: #F1E2D8; }

.composer__icon { width: 18px; height: 18px; }
.composer__icon--sm { width: 12px; height: 12px; }

/* ── 侧栏 ──────────────────────────────────────── */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: #FAF8F5;
  border-right: 1px solid #F0EDE8;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #F0EDE8;
  flex-shrink: 0;
}

.sidebar__title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #5C564E;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__header-actions {
  display: flex;
  gap: 4px;
}

.sidebar__new-btn,
.sidebar__close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;
  color: #B0A89E;
  transition: all 0.15s;
}

.sidebar__new-btn:hover,
.sidebar__close-btn:hover {
  background: #F0EDE8;
  color: #1A1A1A;
}

.sidebar__icon { width: 16px; height: 16px; }

.sidebar__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__empty {
  text-align: center;
  padding: 32px 16px;
  font-size: 13px;
  color: #B0A89E;
}

.sidebar__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.sidebar__item:hover { background: #F0EDE8; }

.sidebar__item--active {
  background: #F1E2D8;
}

.sidebar__item-name {
  font-size: 13px;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.sidebar__item-date {
  font-size: 11px;
  color: #B0A89E;
}

/* 抽屉遮罩 */
.sidebar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 10;
}

/* 抽屉容器 */
.sidebar-drawer {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  z-index: 11;
  transform: translateX(-100%);
  transition: transform 0.25s ease;
  box-shadow: 4px 0 20px rgba(0,0,0,0.12);
}

.sidebar-drawer--open {
  transform: translateX(0);
}

/* ── 嵌入小窗专属 ──────────────────────────────── */
.shell--embed {
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18);
  max-height: 600px;
}

/* ── 响应式：窄容器 ───────────────────────────── */
/* narrow 模式下，侧栏不常驻（由 drawer 控制） */
.shell--narrow .sidebar:not(.sidebar-drawer .sidebar) {
  display: none;
}
```

- [ ] **Step 2: 提交**

```bash
git add app/components/customer-service/customer-service.module.css
git commit -m "feat(styles): add customer-service.module.css — full, embed, drawer, narrow modes"
```

---

## Task 9：新建统一客服壳 index.tsx

**Files:**
- Create: `app/components/customer-service/index.tsx`

- [ ] **Step 1: 创建文件**

```tsx
'use client'
import React, { useRef } from 'react'
import { ClockIcon } from '@heroicons/react/24/outline'
import type { AppTypeValue } from '@/config'
import { useCustomerService } from './use-customer-service'
import { useContainerBreakpoints } from '@/hooks/use-container-breakpoints'
import MessageList from './message-list'
import Composer from './composer'
import SessionSidebar from './session-sidebar'
// CSS Modules
import styles from './customer-service.module.css'

type Props = {
  appType: AppTypeValue
  appParams: any
  appName?: string
  appIcon?: string
  /** true = 以嵌入小窗模式启动 */
  isEmbed?: boolean
  /** 初始 conversationId */
  initialConversationId?: string | null
}

/**
 * 统一客服壳
 *
 * 无论 appType 是 chat / agent / workflow，都走这套 UI：
 * - 完整页：左侧历史栏 + 右侧消息区 + 底部输入栏
 * - 嵌入小窗：紧凑头部 + 消息区 + 抽屉历史 + 底部输入栏
 */
const CustomerServiceShell: React.FC<Props> = ({
  appType,
  appParams,
  appName,
  appIcon,
  isEmbed = false,
  initialConversationId = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const containerSize = useContainerBreakpoints(containerRef)
  const isNarrow = containerSize === 'narrow'
  const isMedium = containerSize === 'medium'
  const useDrawer = isEmbed || isNarrow || isMedium

  const {
    messages,
    isResponding,
    inputText,
    setInputText,
    attachedFiles,
    addFiles,
    removeFile,
    suggestedQuestions,
    handleSend,
    handleStop,
    sessions,
    activeSessionId,
    switchSession,
    startNewSession,
    embedState,
    setHistoryDrawerOpen,
    handleFeedback,
    ttsPlayingMessageId,
    handleTts,
    isRecording,
    handleToggleRecording,
  } = useCustomerService({
    appType,
    appParams,
    isEmbed,
    initialConversationId,
  })

  const ttsEnabled = appParams?.text_to_speech?.enabled === true
  const sttEnabled = appParams?.speech_to_text?.enabled === true
  const fileUploadEnabled = appParams?.file_upload?.enabled === true

  return (
    <div
      ref={containerRef}
      className={[
        styles.shell,
        isEmbed ? styles['shell--embed'] : '',
        isNarrow ? styles['shell--narrow'] : '',
      ].filter(Boolean).join(' ')}
    >
      {/* ── 头部 ── */}
      <header className={`${styles.shell__header} ${isEmbed || isNarrow ? styles['shell__header--compact'] : ''}`}>
        {/* 应用图标 */}
        {appIcon
          ? <img src={appIcon} alt={appName} className={styles.shell__app_icon} />
          : (
              <div className={styles['shell__app-icon-placeholder']} aria-hidden="true">
                {appName?.[0] ?? 'A'}
              </div>
            )}

        {/* 应用名 */}
        <span className={styles['shell__app-name']}>{appName ?? '智能客服'}</span>

        {/* 历史入口（drawer 模式下显示） */}
        {useDrawer && (
          <button
            className={styles['shell__header-btn']}
            onClick={() => setHistoryDrawerOpen(true)}
            title="历史记录"
            aria-label="打开历史记录"
          >
            <ClockIcon className={styles['shell__header-icon']} />
          </button>
        )}
      </header>

      {/* ── 主体区域 ── */}
      <div className={styles.shell__body}>
        {/* 侧边栏历史（非 drawer 模式常驻） */}
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={switchSession}
          onNew={startNewSession}
          drawerMode={useDrawer}
          drawerOpen={embedState.historyDrawerOpen}
          onCloseDrawer={() => setHistoryDrawerOpen(false)}
          appName={appName}
        />

        {/* 主内容区 */}
        <main className={styles.shell__main}>
          {/* 消息流 */}
          <MessageList
            messages={messages}
            appName={appName}
            appIcon={appIcon}
            ttsEnabled={ttsEnabled}
            ttsPlayingMessageId={ttsPlayingMessageId}
            onTts={handleTts}
            onFeedback={handleFeedback}
          />

          {/* 输入区 */}
          <Composer
            value={inputText}
            onChange={setInputText}
            onSend={handleSend}
            onStop={handleStop}
            isResponding={isResponding}
            attachedFiles={attachedFiles}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
            fileUploadEnabled={fileUploadEnabled}
            sttEnabled={sttEnabled}
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
            suggestedQuestions={suggestedQuestions}
            isNarrow={isNarrow}
          />
        </main>
      </div>
    </div>
  )
}

export default CustomerServiceShell
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -40
```

修正所有 CSS Modules 访问方式（`styles['foo']` vs `styles.foo`）确保无报错。

- [ ] **Step 3: 提交**

```bash
git add app/components/customer-service/index.tsx
git commit -m "feat(ui): add CustomerServiceShell — unified entry with sidebar/drawer/embed"
```

---

## Task 10：修改主入口 app/components/index.tsx

**Files:**
- Modify: `app/components/index.tsx`

- [ ] **Step 1: 替换文件内容**

将 `app/components/index.tsx` 全部替换为以下内容（删除旧的 CoolTextGeneration / ChatGeneration 分流逻辑）：

```tsx
'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { fetchAppParams, fetchAppMeta } from '@/service'
import type { AppTypeValue } from '@/config'
import { setLocaleOnClient } from '@/i18n/client'
import type { Locale } from '@/i18n'
import { i18n as i18nConfig } from '@/i18n'
import CustomerServiceShell from './customer-service'
import Loading from '@/app/components/base/loading'

/** Map Dify locale names to supported i18n locales */
function difyLocaleToAppLocale(difyLocale: string): Locale | null {
  const lower = difyLocale.toLowerCase()
  if (lower === 'zh-hans' || lower === 'zh_hans' || lower.startsWith('zh'))
    return 'zh-Hans'
  if (lower.startsWith('en'))
    return 'en'
  return null
}

function detectAppType(params: any, meta: any): AppTypeValue {
  if (params && typeof params === 'object' && 'workflow' in params)
    return 'workflow'

  const isChatLike
    = params?.speech_to_text !== undefined
    || params?.suggested_questions_after_answer !== undefined
    || params?.text_to_speech !== undefined

  if (!isChatLike)
    return 'completion'

  const hasTools
    = meta
    && typeof meta === 'object'
    && 'tool_icons' in meta
    && Object.keys(meta.tool_icons || {}).length > 0

  return hasTools ? 'agent' : 'chat'
}

const AppEntry: React.FC = () => {
  const [appType, setAppType] = useState<AppTypeValue | null>(null)
  const [appParams, setAppParams] = useState<any>(null)
  const [appMeta, setAppMeta] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchAppParams().catch(() => null),
      fetchAppMeta().catch(() => null),
    ]).then(([params, meta]) => {
      if (cancelled) return
      setAppType(detectAppType(params, meta))
      setAppParams(params)
      setAppMeta(meta)

      const difyLang = (params as any)?.default_language
      if (difyLang) {
        const locale = difyLocaleToAppLocale(difyLang)
        if (locale && locale !== i18nConfig.defaultLocale)
          setLocaleOnClient(locale, true)
      }
    })
    return () => { cancelled = true }
  }, [])

  if (appType === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
        <Loading type="area" />
      </div>
    )
  }

  const appName: string = appMeta?.name ?? appParams?.name ?? undefined
  const appIcon: string | undefined = appMeta?.icon ?? undefined

  return (
    <CustomerServiceShell
      appType={appType}
      appParams={appParams}
      appName={appName}
      appIcon={appIcon}
      isEmbed={false}
    />
  )
}

export default AppEntry
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add app/components/index.tsx
git commit -m "feat(entry): route all appTypes to CustomerServiceShell, remove CoolTextGeneration split"
```

---

## Task 11：修改 app/cool/page.tsx（兼容旧路由）

**Files:**
- Modify: `app/cool/page.tsx`

- [ ] **Step 1: 替换内容**

```tsx
/**
 * /cool 路由兼容层
 *
 * 旧的 workflow 工作台入口，改为直接渲染统一客服壳，
 * 保留 URL 兼容性，避免现有书签 / 外链 404。
 */
import React from 'react'
import AppEntry from '@/app/components'

const CoolPage = () => <AppEntry />

export default CoolPage
```

- [ ] **Step 2: 提交**

```bash
git add app/cool/page.tsx
git commit -m "feat(routing): /cool now renders unified CustomerServiceShell for backward compat"
```

---

## Task 12：新建 app/embed/page.tsx

**Files:**
- Create: `app/embed/page.tsx`

- [ ] **Step 1: 创建目录并新建文件**

```bash
mkdir -p /Users/wenyiqing/dify-ai/ai-customer-serviece/app/embed
```

```tsx
/**
 * /embed 嵌入专用入口
 *
 * 第三方网站通过 <iframe src="/embed"> 接入，稳定 URL，
 * 默认以紧凑模式渲染（isEmbed=true）。
 *
 * 用法示例：
 *   <iframe src="https://your-domain.com/embed" width="400" height="600" />
 */
'use client'
import React, { useEffect, useState } from 'react'
import { fetchAppParams, fetchAppMeta } from '@/service'
import type { AppTypeValue } from '@/config'
import CustomerServiceShell from '@/app/components/customer-service'
import Loading from '@/app/components/base/loading'

function detectAppType(params: any, meta: any): AppTypeValue {
  if (params && typeof params === 'object' && 'workflow' in params)
    return 'workflow'

  const isChatLike
    = params?.speech_to_text !== undefined
    || params?.suggested_questions_after_answer !== undefined
    || params?.text_to_speech !== undefined

  if (!isChatLike)
    return 'completion'

  const hasTools
    = meta?.tool_icons && Object.keys(meta.tool_icons).length > 0

  return hasTools ? 'agent' : 'chat'
}

const EmbedPage: React.FC = () => {
  const [appType, setAppType] = useState<AppTypeValue | null>(null)
  const [appParams, setAppParams] = useState<any>(null)
  const [appMeta, setAppMeta] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchAppParams().catch(() => null),
      fetchAppMeta().catch(() => null),
    ]).then(([params, meta]) => {
      if (cancelled) return
      setAppType(detectAppType(params, meta))
      setAppParams(params)
      setAppMeta(meta)
    })
    return () => { cancelled = true }
  }, [])

  if (appType === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100%' }}>
        <Loading type="area" />
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', width: '100%', overflow: 'hidden' }}>
      <CustomerServiceShell
        appType={appType}
        appParams={appParams}
        appName={appMeta?.name ?? appParams?.name}
        appIcon={appMeta?.icon}
        isEmbed={true}
      />
    </div>
  )
}

export default EmbedPage
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add app/embed/page.tsx
git commit -m "feat(routing): add /embed page — stable iframe entry with compact mode"
```

---

## Task 13：更新 i18n 文案

**Files:**
- Modify: `i18n/lang/app.zh.ts`
- Modify: `i18n/lang/app.en.ts`

- [ ] **Step 1: 更新 app.zh.ts**

在 `i18n/lang/app.zh.ts` 的 `translation` 对象中，在 `errorMessage` 之后追加：

```typescript
  customerService: {
    header: {
      title: '智能客服',
      history: '历史记录',
      newSession: '新建会话',
      closeHistory: '关闭',
    },
    message: {
      empty: '有什么可以帮您？',
      thinking: '正在思考…',
      workflowRunning: '工作流运行中…',
      workflowDone: '工作流已完成',
      workflowFailed: '工作流运行失败',
      agentThought: '查看思考过程',
      agentTool: '工具：',
    },
    composer: {
      placeholder: '请输入您的问题…',
      send: '发送',
      stop: '停止生成',
      attach: '上传附件',
      voice: '语音输入',
      stopRecording: '停止录音',
      readAloud: '朗读',
    },
    session: {
      noHistory: '暂无历史记录',
    },
    workflow: {
      statusWaiting: '等待中',
      statusRunning: '运行中…',
      statusSucceeded: '已完成',
      statusFailed: '运行失败',
      statusStopped: '已停止',
      nodes: '个节点',
      expandNodes: '展开节点详情',
      collapseNodes: '收起节点详情',
    },
    errorMessage: {
      uploadFailed: '文件上传失败',
      ttsError: '朗读失败',
      sttError: '录音转文字失败',
      micDenied: '麦克风权限被拒绝',
    },
  },
```

- [ ] **Step 2: 更新 app.en.ts**

在 `i18n/lang/app.en.ts` 的 `errorMessage` 之后追加：

```typescript
  customerService: {
    header: {
      title: 'AI Assistant',
      history: 'History',
      newSession: 'New Session',
      closeHistory: 'Close',
    },
    message: {
      empty: 'How can I help you?',
      thinking: 'Thinking…',
      workflowRunning: 'Workflow running…',
      workflowDone: 'Workflow completed',
      workflowFailed: 'Workflow failed',
      agentThought: 'View thinking process',
      agentTool: 'Tool: ',
    },
    composer: {
      placeholder: 'Type your message…',
      send: 'Send',
      stop: 'Stop',
      attach: 'Attach files',
      voice: 'Voice input',
      stopRecording: 'Stop recording',
      readAloud: 'Read aloud',
    },
    session: {
      noHistory: 'No history yet',
    },
    workflow: {
      statusWaiting: 'Waiting',
      statusRunning: 'Running…',
      statusSucceeded: 'Completed',
      statusFailed: 'Failed',
      statusStopped: 'Stopped',
      nodes: 'nodes',
      expandNodes: 'Show node details',
      collapseNodes: 'Hide node details',
    },
    errorMessage: {
      uploadFailed: 'File upload failed',
      ttsError: 'Read-aloud failed',
      sttError: 'Speech-to-text failed',
      micDenied: 'Microphone permission denied',
    },
  },
```

- [ ] **Step 3: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 提交**

```bash
git add i18n/lang/app.zh.ts i18n/lang/app.en.ts
git commit -m "feat(i18n): add customerService translations (zh + en)"
```

---

## Task 14：本地构建验证

- [ ] **Step 1: 安装依赖（若有新增）**

```bash
cd /Users/wenyiqing/dify-ai/ai-customer-serviece
npm install
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors

- [ ] **Step 3: 构建**

```bash
npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` 或类似成功输出，无 TypeScript 编译错误。

- [ ] **Step 4: 启动开发服务器人工验证**

```bash
npm run dev
```

打开 http://localhost:3000 验证：
1. chat / agent 应用：历史侧栏 + 消息流 + 输入区正常显示
2. workflow 应用：发送后出现 workflow 卡，节点可展开
3. 调整浏览器宽度至 ≤480px：侧栏隐藏，头部显示"历史"按钮，点击弹出抽屉
4. 访问 http://localhost:3000/embed：以小窗模式渲染，无左侧常驻侧栏
5. 访问 http://localhost:3000/cool：正常重定向渲染统一壳

- [ ] **Step 5: 提交最终整合**

```bash
git add -A
git commit -m "feat: unified customer service UI — all appTypes converge on CustomerServiceShell"
```

---

## Self-Review Checklist

### 1. Spec Coverage

| 需求 | 对应 Task |
|------|-----------|
| workflow/chat/agent 统一客服 UI | Task 9, 10 |
| workflow 进度映射进消息流 | Task 3 (hook), Task 4 (WorkflowEventCard), Task 5 |
| 历史侧栏（含抽屉模式） | Task 7 |
| 统一输入区（停止/附件/语音/建议问题） | Task 6 |
| 嵌入 /embed 入口 | Task 12 |
| 容器宽度响应式（非 window.innerWidth） | Task 2 |
| 旧 /cool 路由兼容 | Task 11 |
| 新增类型定义 | Task 1 |
| i18n 文案 | Task 13 |
| 构建验证 | Task 14 |

所有主需求均有对应 Task，未发现遗漏。

### 2. Placeholder Scan

- 无 "TBD" / "TODO" / "implement later"
- 每个 Step 均有完整代码或命令
- 所有引用的类型（`UnifiedMessage`, `WorkflowEventMessage` 等）在 Task 1 已定义

### 3. Type Consistency

- `WorkflowEventMessage.nodes` 使用 `NodeTracing[]`（来自 `types/app.ts`，Task 1 未修改）
- `useCustomerService` 返回 `attachedFiles: AttachedFile[]`，Composer 接收 `attachedFiles: AttachedFile[]` ✓
- `onTts(messageId: string, text: string)` 在 MessageList 与 CustomerServiceShell 中签名一致 ✓
- `EmbedUIState` 在 hook 内部使用，通过 `embedState` 暴露给壳组件 ✓
