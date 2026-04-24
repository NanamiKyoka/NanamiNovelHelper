import { useState, useCallback } from 'react'
import { message } from 'antd'
import type { VocabularyEntry, VocabularyType } from '../../types/vocabulary'

interface UseVocabularyExportOptions {
  currentTypeDefinition: VocabularyType | undefined
  filteredEntries: VocabularyEntry[]
  selectedRowKeys: React.Key[]
}

export function useVocabularyExport({
  currentTypeDefinition,
  filteredEntries,
  selectedRowKeys
}: UseVocabularyExportOptions) {
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'markdown'>('json')
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all')

  const doExport = useCallback((entries: VocabularyEntry[], format: 'json' | 'csv' | 'markdown'): void => {
    const typeName = currentTypeDefinition?.name || '词汇'
    const fields = currentTypeDefinition?.fields.filter(f => f.id !== 'name') || []

    const prepareData = (entry: VocabularyEntry) => ({
      名称: entry.name,
      别名: entry.aliases.join('、'),
      颜色: entry.color,
      标签: entry.tags.join('、'),
      备注: entry.description || '',
      ...Object.fromEntries(
        fields.map(f => {
          const value = entry.fields[f.id]
          return [f.name, Array.isArray(value) ? value.join('、') : (value || '')]
        })
      )
    })

    const data = entries.map(prepareData)
    const dateStr = new Date().toISOString().slice(0, 10)

    let content: string
    let mimeType: string
    let extension: string

    if (format === 'json') {
      content = JSON.stringify(data, null, 2)
      mimeType = 'application/json'
      extension = 'json'
    } else if (format === 'csv') {
      const headers = Object.keys(data[0] || {})
      const csvRows = [
        headers.join(','),
        ...data.map(row =>
          headers.map(h => {
            const cell = String(row[h as keyof typeof row] || '')
            return cell.includes(',') || cell.includes('"') || cell.includes('\n')
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          }).join(',')
        )
      ]
      content = '\uFEFF' + csvRows.join('\n')
      mimeType = 'text/csv;charset=utf-8'
      extension = 'csv'
    } else {
      const headers = Object.keys(data[0] || {})
      const mdLines = [
        `# ${typeName}词汇导出`,
        `导出时间：${dateStr}`,
        `共 ${entries.length} 条记录`,
        '',
        '---',
        ''
      ]

      entries.forEach((entry, index) => {
        mdLines.push(`## ${index + 1}. ${entry.name}`)
        mdLines.push('')
        headers.forEach(h => {
          const value = data[index][h as keyof typeof data[0]]
          if (value) {
            mdLines.push(`**${h}**：${value}`)
          }
        })
        mdLines.push('')
        mdLines.push('---')
        mdLines.push('')
      })

      content = mdLines.join('\n')
      mimeType = 'text/markdown;charset=utf-8'
      extension = 'md'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${typeName}_导出_${dateStr}.${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    message.success(`成功导出 ${entries.length} 个词汇`)
  }, [currentTypeDefinition])

  const handleBatchExport = useCallback((): void => {
    if (selectedRowKeys.length === 0) return
    setExportScope('selected')
    setExportModalOpen(true)
  }, [selectedRowKeys.length])

  const handleExportAll = useCallback((): void => {
    if (filteredEntries.length === 0) {
      message.warning('没有可导出的数据')
      return
    }
    setExportScope('all')
    setExportModalOpen(true)
  }, [filteredEntries.length])

  const confirmExport = useCallback((): void => {
    const entries = exportScope === 'selected'
      ? filteredEntries.filter(e => selectedRowKeys.includes(e.id))
      : filteredEntries
    doExport(entries, exportFormat)
    setExportModalOpen(false)
  }, [exportScope, filteredEntries, selectedRowKeys, exportFormat, doExport])

  return {
    exportModalOpen,
    setExportModalOpen,
    exportFormat,
    setExportFormat,
    exportScope,
    setExportScope,
    handleBatchExport,
    handleExportAll,
    confirmExport
  }
}
