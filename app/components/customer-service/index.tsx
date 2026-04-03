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

type AppParams = {
  text_to_speech?: { enabled?: boolean }
  speech_to_text?: { enabled?: boolean }
  file_upload?: { enabled?: boolean; number_limits?: number }
  suggested_questions_after_answer?: { enabled?: boolean }
  user_input_form?: unknown
  default_language?: string
  name?: string
}

type Props = {
  appType: AppTypeValue
  appParams: AppParams | null
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
      <header className={[styles.shell__header, isEmbed || isNarrow ? styles['shell__header--compact'] : ''].filter(Boolean).join(' ')}>
        {/* 应用图标 */}
        {appIcon
          ? <img src={appIcon} alt={appName ?? ''} className={styles['shell__app-icon']} />
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
            type="button"
            className={styles['shell__header-btn']}
            onClick={() => setHistoryDrawerOpen(true)}
            title="打开历史记录"
            aria-label="打开历史记录"
          >
            <ClockIcon className={styles['shell__header-icon']} aria-hidden="true" />
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
