/**
 * 写作目标设置组件
 */

import { Card, Form, InputNumber, Button, App } from 'antd'
import { useWritingGoalStore } from '@stores/writingGoalStore'
import { FireOutlined } from '@ant-design/icons'
import baseStyles from './SettingsBase.module.css'

export function WritingGoalSettings() {
  const { message } = App.useApp()
  const dailyGoal = useWritingGoalStore(state => state.dailyGoal)
  const setDailyGoal = useWritingGoalStore(state => state.setDailyGoal)
  const resetToday = useWritingGoalStore(state => state.resetToday)

  const handleGoalChange = (value: number | null) => {
    setDailyGoal(value || 0)
    message.success('每日目标已更新')
  }

  const handleResetToday = () => {
    resetToday()
    message.success('今日计数已重置')
  }

  return (
    <div className={baseStyles.container}>
      <Card title="每日目标" className={baseStyles.card}>
        <Form layout="vertical" size="small">
          <Form.Item label="每日目标字数">
            <InputNumber
              min={0}
              max={50000}
              step={100}
              value={dailyGoal}
              onChange={handleGoalChange}
              style={{ width: '100%' }}
              placeholder="输入每日目标字数（0 表示不设置）"
            />
          </Form.Item>
        </Form>
      </Card>

      <Card title="数据管理" className={baseStyles.card}>
        <div className={baseStyles.actionItem}>
          <div className={baseStyles.actionInfo}>
            <div>重置今日计数</div>
            <div className={baseStyles.hint}>将今日已写字数清零，不影响历史数据</div>
          </div>
          <Button icon={<FireOutlined />} danger onClick={handleResetToday}>
            重置
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default WritingGoalSettings
