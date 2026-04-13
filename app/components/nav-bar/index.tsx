'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import styles from './nav-bar.module.css'

const NavBar = () => {
  const pathname = usePathname()
  const { t } = useTranslation()

  const NAV_LINKS = [
    { label: t('app.nav.demo'),    href: '/' },
    { label: t('app.nav.support'), href: '/support' },
    { label: t('app.nav.embed'),   href: '/embed' },
    { label: t('app.nav.legacy'),  href: '/cool', legacy: true },
  ]

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {/* 左侧 Logo 区 */}
      <div className={styles.brand}>
        <span className={styles.brandIcon}>🤖</span>
        <span className={styles.brandName}>{t('app.nav.brandName')}</span>
      </div>

      {/* 右侧导航链接 */}
      <ul className={styles.links}>
        {NAV_LINKS.map(({ label, href, legacy }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={[
                styles.link,
                pathname === href ? styles.linkActive : '',
                legacy ? styles.linkLegacy : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {label}
              {legacy && <span className={styles.legacyBadge}>{t('app.nav.legacyBadge')}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default NavBar
