export interface DailyWritingStats {
  date: string // ISO 日期格式 YYYY-MM-DD
  wordCount: number
}

export interface WritingStatsData {
  stats: DailyWritingStats[]
}

export interface WritingGoalConfig {
  dailyGoal: number // 每日目标字数，默认 0（表示未设置）
}
