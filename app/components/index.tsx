'use client'
import React, { useEffect, useState } from 'react'
import { fetchAppParams, fetchAppMeta } from '@/service'
import { setLocaleOnClient } from '@/i18n/client'
import { i18n as i18nConfig } from '@/i18n'
import { detectAppType, difyLocaleToAppLocale } from '@/utils/detect-app-type'
import CustomerServiceShell from './customer-service'
import Loading from '@/app/components/base/loading'

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
