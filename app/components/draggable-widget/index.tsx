'use client'

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import { useTranslation } from 'react-i18next'
import WidgetButton from './widget-button'
import styles from './draggable-widget.module.css'

interface DraggableWidgetProps {
  /** iframe embed URL — defaults to this site's /embed page.
   *  To connect any chatbot, only this one line needs to change.
   *  Example: embedUrl="https://your-bot.example.com/embed"
   */
  embedUrl?: string
  /** Panel title shown on the drag handle (falls back to the i18n default when omitted). */
  title?: string
}

/** Widget states */
type WidgetState = 'collapsed' | 'open' | 'closing'

/** Default bottom-right offset (relative to viewport) */
const DEFAULT_RIGHT = 24
const DEFAULT_BOTTOM = 24

/** Panel dimensions (desktop) */
const PANEL_W = 400
const PANEL_H = 560

/**
 * DraggableWidget
 *
 * Draggable customer service widget container.
 * Content is embedded via <iframe> from the /embed page, fully decoupled from business logic:
 *  - Anyone using this template only needs to change embedUrl to their own bot address.
 *  - Drag logic is implemented with native events; boundary detection prevents the panel
 *    from being dragged outside the viewport.
 */
const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  embedUrl = '/embed',
  title,
}) => {
  const { t } = useTranslation()
  const panelTitle = title ?? t('app.widget.defaultTitle')
  const [state, setState] = useState<WidgetState>('open')
  // Panel offset from the fixed default position (px)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  // Whether the user has dragged the panel (determines whether to use transform positioning)
  const [isDragged, setIsDragged] = useState(false)

  const dragging = useRef(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 })
  const rootRef = useRef<HTMLDivElement>(null)

  // ── Open ──
  const handleOpen = useCallback(() => {
    setState('open')
  }, [])

  // ── Close (with animation) ──
  const handleClose = useCallback(() => {
    setState('closing')
    setTimeout(() => setState('collapsed'), 200)
  }, [])

  // ── Drag: mousedown on header triggers drag ──
  const handleDragStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (state !== 'open') return
      dragging.current = true

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

      dragStart.current = {
        mouseX: clientX,
        mouseY: clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      }
    },
    [state, offset],
  )

  // ── Drag: global mousemove / touchmove ──
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

      const dx = clientX - dragStart.current.mouseX
      const dy = clientY - dragStart.current.mouseY

      let newX = dragStart.current.offsetX + dx
      let newY = dragStart.current.offsetY + dy

      // Boundary detection: keep at least 60px of the panel visible
      const vw = window.innerWidth
      const vh = window.innerHeight
      const keepVisible = 60

      const panelRight = DEFAULT_RIGHT - newX
      const panelBottom = DEFAULT_BOTTOM - newY

      if (panelRight < keepVisible - PANEL_W) newX = PANEL_W - keepVisible - DEFAULT_RIGHT
      if (panelRight > vw - keepVisible) newX = -(vw - keepVisible - DEFAULT_RIGHT)
      if (panelBottom < keepVisible - PANEL_H) newY = PANEL_H - keepVisible - DEFAULT_BOTTOM
      if (panelBottom > vh - keepVisible) newY = -(vh - keepVisible - DEFAULT_BOTTOM)

      setOffset({ x: newX, y: newY })
      setIsDragged(true)
    }

    const onUp = () => { dragging.current = false }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  // ── Compute inline style for the root container ──
  const rootStyle: React.CSSProperties = isDragged
    ? {
      right: DEFAULT_RIGHT,
      bottom: DEFAULT_BOTTOM,
      transform: `translate(${-offset.x}px, ${-offset.y}px)`,
    }
    : {}

  return (
    <div ref={rootRef} className={styles.widgetRoot} style={rootStyle}>
      {/* Collapsed state: show trigger button only */}
      {state === 'collapsed' && <WidgetButton onClick={handleOpen} />}

      {/* Open / closing animation state: show panel */}
      {(state === 'open' || state === 'closing') && (
        <div
          className={`${styles.panel}${state === 'closing' ? ` ${styles.panelClosing}` : ''}`}
        >
          {/* Drag handle: panel header */}
          <div
            className={styles.panelHeader}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <div className={styles.panelHeaderLeft}>
              <span className={styles.panelHeaderDot} />
              <span className={styles.panelTitle}>{panelTitle}</span>
            </div>
            <div className={styles.panelHeaderActions}>
              {/* Minimize (collapse to button) */}
              <button
                className={styles.headerBtn}
                onClick={handleClose}
                title={t('app.widget.minimize')}
                aria-label={t('app.widget.minimize')}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              {/* Close */}
              <button
                className={styles.headerBtn}
                onClick={handleClose}
                title={t('app.widget.close')}
                aria-label={t('app.widget.close')}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* ✅ Content area: /embed page embedded via iframe.
               Change the embedUrl prop to connect your own bot. */}
          <div className={styles.panelBody}>
            <iframe
              src={embedUrl}
              title={panelTitle}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="microphone"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default DraggableWidget
