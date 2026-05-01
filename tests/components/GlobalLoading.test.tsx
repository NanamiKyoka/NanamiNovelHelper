import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { GlobalLoading, AppInitLoading } from '@components/common/GlobalLoading/GlobalLoading'
import { useLoadingStore } from '@stores/loadingStore'

describe('GlobalLoading', () => {
  it('不在加载状态时不应渲染', () => {
    useLoadingStore.setState({
      modules: {},
      showGlobalOverlay: false
    })
    const { container } = render(<GlobalLoading />)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('加载状态时应渲染', () => {
    useLoadingStore.setState({
      modules: {
        project: { loading: true, message: '加载项目...' }
      },
      showGlobalOverlay: true
    })
    const { container } = render(<GlobalLoading />)
    expect(container.querySelector('[role="alert"]')).toBeTruthy()
  })
})

describe('AppInitLoading', () => {
  it('应该渲染初始化加载界面', () => {
    const { container } = render(<AppInitLoading />)
    expect(container.querySelector('.ant-spin')).toBeTruthy()
  })

  it('应该显示自定义消息', () => {
    const { getByText } = render(<AppInitLoading message="自定义消息" />)
    expect(getByText('自定义消息')).toBeTruthy()
  })
})
