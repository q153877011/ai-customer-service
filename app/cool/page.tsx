/**
 * /cool 路由兼容层
 *
 * 旧的 workflow 工作台入口，改为直接渲染统一客服壳，
 * 保留 URL 兼容性，避免现有书签 / 外链 404。
 */
import React from 'react'
import AppEntry from '@/app/components'

const CoolPage = () => <AppEntry />

export default CoolPage
