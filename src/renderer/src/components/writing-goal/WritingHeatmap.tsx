/**
 * 写作热力图组件（竖向排布，今日居中）
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

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10)
}

const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const WEEKDAY_NAMES = ['一', '二', '三', '四', '五', '六', '日']

export function WritingHeatmap({ stats }: WritingHeatmapProps) {
  const statsMap = new Map(stats.map(s => [s.date, s.wordCount]))
  const today = new Date()

  // 从今日往前约半年，对齐到周一
  const start = new Date(today)
  start.setDate(start.getDate() - 183)
  const startDow = start.getDay()
  const startOffset = startDow === 0 ? 6 : startDow - 1
  start.setDate(start.getDate() - startOffset)

  // 从今日往后约半年，对齐到周日
  const end = new Date(today)
  end.setDate(end.getDate() + 183)
  const endDow = end.getDay()
  const endOffset = endDow === 0 ? 0 : 7 - endDow
  end.setDate(end.getDate() + endOffset)

  // 生成所有天数
  const days: { date: string; wordCount: number; month: number }[] = []
  const cur = new Date(start)
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10)
    days.push({ date: ds, wordCount: statsMap.get(ds) || 0, month: cur.getMonth() })
    cur.setDate(cur.getDate() + 1)
  }

  // 按周分组（每行一周）
  const weeks: typeof days[] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div className={styles.container}>
      {/* 星期标题 */}
      <div className={styles.weekdayHeader}>
        <div className={styles.monthPlaceholder} />
        {WEEKDAY_NAMES.map(d => (
          <div key={d} className={styles.weekdayLabel}>{d}</div>
        ))}
      </div>

      <div className={styles.weeksContainer}>
        {weeks.map((week, wi) => {
          const firstValid = week.find(d => d.date)
          const month = firstValid ? new Date(firstValid.date).getMonth() : -1
          const prevWeek = weeks[wi - 1]
          const prevFirst = prevWeek?.find(d => d.date)
          const prevMonth = prevFirst ? new Date(prevFirst.date).getMonth() : -1
          const showMonth = month !== -1 && month !== prevMonth

          return (
            <div key={wi} className={styles.weekRow}>
              <div className={styles.monthLabel}>
                {showMonth ? MONTH_NAMES[month] : ''}
              </div>
              {week.map((day, di) => {
                const todayClass = day.date && isToday(day.date) ? styles.today : ''
                if (!day.date) {
                  return (
                    <div
                      key={di}
                      className={styles.day}
                      style={{ visibility: 'hidden' }}
                    />
                  )
                }
                return (
                  <Tooltip
                    key={di}
                    title={`${formatDate(day.date)}: ${day.wordCount.toLocaleString('zh-CN')} 字`}
                  >
                    <div className={`${styles.day} ${getLevelClass(day.wordCount)} ${todayClass}`} />
                  </Tooltip>
                )
              })}
            </div>
          )
        })}
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
