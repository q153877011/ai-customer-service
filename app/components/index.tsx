'use client'
import React, { useEffect, useState } from 'react'
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

  const appName: string | undefined = appMeta?.name ?? appParams?.name ?? undefined
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
