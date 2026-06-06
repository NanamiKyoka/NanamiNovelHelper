/**
 * 写作目标侧边栏面板
 */

import { Card, Statistic, Typography } from 'antd'
import { useWritingGoalStore } from '@stores/writingGoalStore'
import { WritingHeatmap } from './WritingHeatmap'
import styles from './WritingGoalPanel.module.css'

const { Title } = Typography

export function WritingGoalPanel() {
  const stats = useWritingGoalStore(state => state.stats)
  const todayWords = useWritingGoalStore(state => state.todayWords)
  const dailyGoal = useWritingGoalStore(state => state.dailyGoal)
  const getMonthlyWords = useWritingGoalStore(state => state.getMonthlyWords)
  const getYearlyWords = useWritingGoalStore(state => state.getYearlyWords)
  const getStreakDays = useWritingGoalStore(state => state.getStreakDays)

  const monthlyWords = getMonthlyWords()
  const yearlyWords = getYearlyWords()
  const streakDays = getStreakDays()

  return (
    <div className={styles.container}>
      <Title level={5} className={styles.title}>
        写作统计
      </Title>

      <div className={styles.statsGrid}>
        <Card size="small" className={styles.statCard}>
          <Statistic
            title="今日字数"
            value={todayWords}
            suffix={dailyGoal > 0 ? `/ ${dailyGoal}` : ''}
          />
        </Card>
        <Card size="small" className={styles.statCard}>
          <Statistic title="本月字数" value={monthlyWords} />
        </Card>
        <Card size="small" className={styles.statCard}>
          <Statistic title="本年字数" value={yearlyWords} />
        </Card>
        <Card size="small" className={styles.statCard}>
          <Statistic title="连续写作" value={streakDays} suffix="天" />
        </Card>
      </div>

      <div className={styles.heatmapSection}>
        <Title level={5} className={styles.subTitle}>
          写作热力图
        </Title>
        <WritingHeatmap stats={stats} />
      </div>
    </div>
  )
}

export default WritingGoalPanel
