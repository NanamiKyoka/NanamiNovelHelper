/**
 * 写作热力图组件
 */

import { Tooltip } from 'antd'
import type { DailyWritingStats } from '@shared/writing-goal'
import styles from './WritingHeatmap.module.css'

interface WritingHeatmapProps {
  stats: DailyWritingStats[]
}

function getLevelClass(wordCount: number): string {
  if (wordCount === 0) return styles.level0
  if (wordCount <= 500) return styles.level1
  if (wordCount <= 1500) return styles.level2
  if (wordCount <= 3000) return styles.level3
  return styles.level4
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

const WEEKDAY_LABELS = ['', '一', '', '三', '', '五', '']

export function WritingHeatmap({ stats }: WritingHeatmapProps) {
  const today = new Date()
  const days: { date: string; wordCount: number }[] = []
  const statsMap = new Map(stats.map(s => [s.date, s.wordCount]))

  // 生成过去 365 天的数据
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    days.push({
      date: dateStr,
      wordCount: statsMap.get(dateStr) || 0
    })
  }

  // 按周分组
  const weeks: { date: string; wordCount: number }[][] = []
  let currentWeek: { date: string; wordCount: number }[] = []

  // 补齐第一周前面的空白天数
  const firstDay = new Date(days[0].date)
  const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: '', wordCount: 0 })
  }

  for (const day of days) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', wordCount: 0 })
    }
    weeks.push(currentWeek)
  }

  // 月份标签
  const monthPositions: { label: string; offset: number }[] = []
  let currentMonth = -1
  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const week = weeks[weekIndex]
    for (const day of week) {
      if (day.date) {
        const month = new Date(day.date).getMonth()
        if (month !== currentMonth) {
          currentMonth = month
          const labels = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
          monthPositions.push({ label: labels[month], offset: weekIndex * 14 })
        }
        break
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.monthLabels} style={{ marginLeft: 20 }}>
        {monthPositions.map((m, i) => (
          <div
            key={i}
            className={styles.monthLabel}
            style={{ marginLeft: i === 0 ? 0 : Math.max(0, m.offset - (monthPositions[i - 1]?.offset || 0) - 28) }}
          >
            {m.label}
          </div>
        ))}
      </div>
      <div className={styles.weeks}>
        <div className={styles.weekLabels}>
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className={label ? styles.weekLabel : styles.weekLabelEmpty}>
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className={styles.days}>
            {week.map((day, dayIndex) =>
              day.date ? (
                <Tooltip
                  key={dayIndex}
                  title={`${formatDate(day.date)}: ${day.wordCount.toLocaleString('zh-CN')} 字`}
                >
                  <div className={`${styles.day} ${getLevelClass(day.wordCount)}`} />
                </Tooltip>
              ) : (
                <div key={dayIndex} className={styles.day} style={{ visibility: 'hidden' }} />
              )
            )}
          </div>
        ))}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendLabel}>少</span>
        <div className={`${styles.legendBox} ${styles.level0}`} />
        <div className={`${styles.legendBox} ${styles.level1}`} />
        <div className={`${styles.legendBox} ${styles.level2}`} />
        <div className={`${styles.legendBox} ${styles.level3}`} />
        <div className={`${styles.legendBox} ${styles.level4}`} />
        <span className={styles.legendLabel}>多</span>
      </div>
    </div>
  )
}

export default WritingHeatmap
