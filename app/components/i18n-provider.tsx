'use client'

/**
 * I18nProvider
 *
 * Initializes the i18next instance at the application root, ensuring all child
 * components that call useTranslation() receive an already-initialized instance
 * and avoiding SSR hydration mismatches.
 *
 * Importing 'i18next-config' triggers the singleton initialization side-effect;
 * I18nextProvider then injects the same instance into the React component tree.
 */
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n/i18next-config'

const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  )
}

export default I18nProvider
