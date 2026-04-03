# NavBar Header Navigation Design Spec

**Date:** 2026-04-03
**Status:** Approved

---

## Goal

Add a top navigation bar to the homepage (`/`) so users can navigate between the three existing example pages.

## Pages to Link

| Label | Route | Description |
|-------|-------|-------------|
| 首页 | `/` | Main customer service chat UI |
| Legacy | `/cool` | Legacy route (same UI) |
| Embed | `/embed` | Embed widget preview |

## Architecture

- New independent component: `app/components/nav-bar/`
- NavBar is rendered **only** in `app/page.tsx` (not in `app/layout.tsx`)
- This keeps `/embed` unaffected — the embed widget has no top nav
- Uses Next.js `usePathname()` hook to detect the active route

## Component Structure

```
app/components/nav-bar/
  index.tsx          — NavBar component (client component, uses usePathname)
  nav-bar.module.css — Scoped styles
```

## Visual Design

**Overall bar:**
- Background: `#FFFEFA` (matches shell background)
- Border-bottom: `1px solid #F0EDE8` (matches existing dividers)
- Height: 48px
- Padding: `0 20px`
- Display: flex, align-items: center, justify-content: flex-end

**Links:**
- Font-size: 14px, font-weight: 500
- Gap between links: 4px
- Padding per link: `6px 12px`
- Border-radius: 8px
- Default color: `#5C564E`
- Hover: background `#F6F3EE`, color `#1A1A1A`
- Active (current page): color `#C8754A`, background `#F1E2D8`
- Transition: `background 0.15s, color 0.15s`
- No text-decoration (underline)

## Integration Point

`app/page.tsx` becomes:

```tsx
import NavBar from '@/app/components/nav-bar'
import Main from '@/app/components'

const App = () => (
  <>
    <NavBar />
    <Main />
  </>
)
```

## Constraints

- NavBar must be a `'use client'` component (needs `usePathname`)
- Do NOT add NavBar to `app/layout.tsx` — embed page must stay nav-free
- Follow existing CSS Modules pattern used throughout the codebase
- Colors must match the existing warm palette (`#C8754A`, `#F0EDE8`, `#FFFEFA`, etc.)
