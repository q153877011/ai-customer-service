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
