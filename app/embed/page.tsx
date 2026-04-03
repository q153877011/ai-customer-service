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
