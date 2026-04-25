import { useState, useMemo, useCallback } from 'react'
import type { VocabularyEntry } from '@shared/vocabulary'

interface UseVocabularyFilterOptions {
  entries: VocabularyEntry[]
  searchText: string
}

interface FilterState {
  filterTags: string[]
  filterColor: string
  filterHasLinkedFile: boolean | null
  filterStarred: boolean | null
}

export function useVocabularyFilter({ entries, searchText }: UseVocabularyFilterOptions) {
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [filterColor, setFilterColor] = useState<string>('')
  const [filterHasLinkedFile, setFilterHasLinkedFile] = useState<boolean | null>(null)
  const [filterStarred, setFilterStarred] = useState<boolean | null>(null)

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    entries.forEach(item => {
      item.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [entries])

  const allColors = useMemo(() => {
    const colorSet = new Set<string>()
    entries.forEach(item => {
      colorSet.add(item.color)
    })
    return Array.from(colorSet)
  }, [entries])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterTags.length > 0) count++
    if (filterColor) count++
    if (filterHasLinkedFile !== null) count++
    if (filterStarred !== null) count++
    return count
  }, [filterTags, filterColor, filterHasLinkedFile, filterStarred])

  const clearAllFilters = useCallback(() => {
    setFilterTags([])
    setFilterColor('')
    setFilterHasLinkedFile(null)
    setFilterStarred(null)
  }, [])

  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      if (searchText) {
        const keywordMatch =
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.aliases.some(a => a.toLowerCase().includes(searchText.toLowerCase()))
        if (!keywordMatch) return false
      }

      if (filterTags.length > 0) {
        const hasAllTags = filterTags.every(tag => item.tags.includes(tag))
        if (!hasAllTags) return false
      }

      if (filterColor) {
        if (item.color !== filterColor) return false
      }

      if (filterHasLinkedFile !== null) {
        const hasLinkedFile = !!item.linkedFilePath
        if (filterHasLinkedFile !== hasLinkedFile) return false
      }

      if (filterStarred !== null) {
        if (filterStarred !== !!item.starred) return false
      }

      return true
    })
  }, [entries, searchText, filterTags, filterColor, filterHasLinkedFile, filterStarred])

  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const aStarred = !!a.starred
      const bStarred = !!b.starred
      if (aStarred !== bStarred) {
        return aStarred ? -1 : 1
      }
      return (a.order ?? 0) - (b.order ?? 0)
    })
  }, [filteredEntries])

  const filterState: FilterState = {
    filterTags,
    filterColor,
    filterHasLinkedFile,
    filterStarred
  }

  return {
    filteredEntries,
    sortedEntries,
    allTags,
    allColors,
    activeFilterCount,
    clearAllFilters,
    filterState,
    setFilterTags,
    setFilterColor,
    setFilterHasLinkedFile,
    setFilterStarred
  }
}
