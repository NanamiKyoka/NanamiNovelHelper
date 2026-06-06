import { create } from 'zustand'
import type { DailyWritingStats } from '@shared/writing-goal'

interface WritingGoalState {
  dailyGoal: number
  todayWords: number
  stats: DailyWritingStats[]
  isLoading: boolean

  loadStats: () => Promise<void>
  updateTodayWords: (delta: number) => Promise<void>
  setDailyGoal: (goal: number) => Promise<void>
  resetToday: () => Promise<void>
  getMonthlyWords: () => number
  getYearlyWords: () => number
  getStreakDays: () => number
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export const useWritingGoalStore = create<WritingGoalState>((set, get) => ({
  dailyGoal: 0,
  todayWords: 0,
  stats: [],
  isLoading: false,

  loadStats: async () => {
    set({ isLoading: true })
    try {
      const data = await window.api.writingGoal.getStats()
      const stats = data?.stats || []
      const today = getTodayDate()
      const todayStats = stats.find(s => s.date === today)
      const todayWords = todayStats?.wordCount || 0

      const projectSettings = await window.api.settings.project.getAll()
      const dailyGoal = (projectSettings as Record<string, unknown>)?.writingGoal?.dailyGoal as number || 0

      set({ stats, todayWords, dailyGoal, isLoading: false })
    } catch (error) {
      console.error('Failed to load writing stats:', error)
      set({ isLoading: false })
    }
  },

  updateTodayWords: async delta => {
    try {
      const today = getTodayDate()
      await window.api.writingGoal.updateDailyStats(today, delta)
      await get().loadStats()
    } catch (error) {
      console.error('Failed to update today words:', error)
      throw error
    }
  },

  setDailyGoal: async goal => {
    try {
      await window.api.settings.project.update({ writingGoal: { dailyGoal: goal } })
      set({ dailyGoal: goal })
    } catch (error) {
      console.error('Failed to set daily goal:', error)
      throw error
    }
  },

  resetToday: async () => {
    const { todayWords } = get()
    if (todayWords !== 0) {
      await get().updateTodayWords(-todayWords)
    }
  },

  getMonthlyWords: () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    return get()
      .stats.filter(s => {
        const d = new Date(s.date)
        return d.getFullYear() === year && d.getMonth() === month
      })
      .reduce((sum, s) => sum + s.wordCount, 0)
  },

  getYearlyWords: () => {
    const year = new Date().getFullYear()
    return get()
      .stats.filter(s => new Date(s.date).getFullYear() === year)
      .reduce((sum, s) => sum + s.wordCount, 0)
  },

  getStreakDays: () => {
    const stats = get().stats
    if (stats.length === 0) return 0

    const sorted = [...stats].sort((a, b) => b.date.localeCompare(a.date))
    let streak = 0
    const today = getTodayDate()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // 如果今天没有数据，从昨天开始算
    let checkDate = sorted[0].date === today ? today : yesterdayStr
    let started = false

    for (const stat of sorted) {
      if (!started) {
        if (stat.date !== checkDate && stat.date !== today && stat.date !== yesterdayStr) {
          return 0
        }
        if (stat.date === today || stat.date === yesterdayStr) {
          started = true
          if (stat.wordCount > 0) streak++
          else return streak
        }
        continue
      }

      const expected = new Date(checkDate)
      expected.setDate(expected.getDate() - 1)
      const expectedStr = expected.toISOString().split('T')[0]

      if (stat.date === expectedStr && stat.wordCount > 0) {
        streak++
        checkDate = expectedStr
      } else {
        break
      }
    }

    return streak
  }
}))
