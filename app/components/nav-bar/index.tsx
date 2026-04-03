'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './nav-bar.module.css'

const NAV_LINKS = [
  { label: '首页', href: '/' },
  { label: 'Legacy', href: '/cool' },
  { label: 'Embed', href: '/embed' },
] as const

const NavBar = () => {
  const pathname = usePathname()

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <ul className={styles.links}>
        {NAV_LINKS.map(({ label, href }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={`${styles.link}${pathname === href ? ` ${styles.linkActive}` : ''}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default NavBar
