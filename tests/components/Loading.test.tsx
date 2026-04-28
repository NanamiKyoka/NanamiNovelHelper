import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  Loading,
  PageLoading,
  ContentLoading,
  InlineLoading
} from '@renderer/components/common/Loading/Loading'

describe('Loading', () => {
  it('应该渲染加载组件', () => {
    const { container } = render(<Loading />)
    const spinElement = container.querySelector('.ant-spin')
    expect(spinElement).toBeInTheDocument()
  })

  it('应该将tip属性传递给Spin组件', () => {
    const { container } = render(<Loading tip="正在加载数据" />)
    const spinElement = container.querySelector('.ant-spin')
    expect(spinElement).toBeInTheDocument()
    expect(spinElement).toHaveAttribute('aria-busy', 'true')
  })

  it('应该渲染容器元素', () => {
    const { container } = render(<Loading />)
    const loadingContainer = container.firstChild as HTMLElement
    expect(loadingContainer).toBeDefined()
  })

  it('centered属性应该添加居中样式类', () => {
    const { container } = render(<Loading centered />)
    const loadingContainer = container.firstChild as HTMLElement
    expect(loadingContainer.className).toContain('centered')
  })

  it('fullscreen属性应该添加全屏样式类', () => {
    const { container } = render(<Loading fullscreen />)
    const loadingContainer = container.firstChild as HTMLElement
    expect(loadingContainer.className).toContain('fullscreen')
  })

  it('应该支持自定义className', () => {
    const { container } = render(<Loading className="custom-class" />)
    const loadingContainer = container.firstChild as HTMLElement
    expect(loadingContainer.className).toContain('custom-class')
  })

  it('应该显示spinning状态', () => {
    const { container } = render(<Loading />)
    const spinElement = container.querySelector('.ant-spin-spinning')
    expect(spinElement).toBeInTheDocument()
  })
})

describe('PageLoading', () => {
  it('应该渲染页面级加载', () => {
    const { container } = render(<PageLoading />)
    expect(container.querySelector('.ant-spin')).toBeInTheDocument()
  })

  it('应该是全屏模式', () => {
    const { container } = render(<PageLoading />)
    const loadingContainer = container.firstChild as HTMLElement
    expect(loadingContainer.className).toContain('fullscreen')
  })
})

describe('ContentLoading', () => {
  it('应该渲染内容区加载', () => {
    const { container } = render(<ContentLoading />)
    expect(container.querySelector('.ant-spin')).toBeInTheDocument()
  })

  it('应该是居中模式', () => {
    const { container } = render(<ContentLoading />)
    const loadingContainer = container.firstChild as HTMLElement
    expect(loadingContainer.className).toContain('centered')
  })
})

describe('InlineLoading', () => {
  it('应该渲染内联加载', () => {
    const { container } = render(<InlineLoading />)
    expect(container.querySelector('.ant-spin')).toBeInTheDocument()
  })

  it('应该是小尺寸', () => {
    const { container } = render(<InlineLoading />)
    const spin = container.querySelector('.ant-spin')
    expect(spin?.className).toContain('ant-spin-sm')
  })
})
