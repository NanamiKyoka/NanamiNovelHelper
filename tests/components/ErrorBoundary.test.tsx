import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ErrorBoundary,
  ModuleErrorBoundary
} from '@renderer/components/common/ErrorBoundary/ErrorBoundary'

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>正常内容</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('正常子组件应该正常渲染', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('正常内容')).toBeInTheDocument()
  })

  it('子组件抛出错误时应该显示错误界面', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.queryByText('正常内容')).not.toBeInTheDocument()
    expect(screen.getByText('页面出错了')).toBeInTheDocument()
  })

  it('应该显示自定义fallback', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">出错了</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.getByText('出错了')).toBeInTheDocument()
  })

  it('应该调用onError回调', () => {
    const onError = vi.fn()
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledTimes(1)
    const [error, errorInfo] = onError.mock.calls[0]
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Test error')
    expect(errorInfo).toHaveProperty('componentStack')
  })

  it('没有自定义fallback时应该显示默认错误界面', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('页面出错了')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('应该显示重试按钮', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    const buttons = screen.getAllByRole('button')
    const buttonTexts = buttons.map(b => b.textContent)
    expect(buttonTexts.some(t => t?.includes('重试') || t?.includes('重 试'))).toBe(true)
    expect(buttonTexts.some(t => t?.includes('刷新页面'))).toBe(true)
  })

  it('点击重试按钮应该重置错误状态', async () => {
    const user = userEvent.setup()
    let shouldThrow = true

    function ConditionalThrower() {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>正常内容</div>
    }

    render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>
    )

    expect(screen.getByText('页面出错了')).toBeInTheDocument()

    shouldThrow = false

    const retryButton = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('重试') || b.textContent?.includes('重 试'))
    expect(retryButton).toBeDefined()
    await user.click(retryButton!)

    expect(screen.getByText('正常内容')).toBeInTheDocument()
  })

  it('应该支持自定义重试按钮文字', () => {
    render(
      <ErrorBoundary resetButtonText="重新加载">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    const buttons = screen.getAllByRole('button')
    const buttonTexts = buttons.map(b => b.textContent)
    expect(buttonTexts.some(t => t?.includes('重新加载'))).toBe(true)
  })

  it('嵌套ErrorBoundary应该由最近的边界捕获', () => {
    render(
      <ErrorBoundary fallback={<div>外层错误</div>}>
        <ErrorBoundary fallback={<div>内层错误</div>}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      </ErrorBoundary>
    )

    expect(screen.getByText('内层错误')).toBeInTheDocument()
    expect(screen.queryByText('外层错误')).not.toBeInTheDocument()
  })

  it('错误消息为空时应该显示默认副标题', () => {
    function ThrowNullMessage() {
      throw new Error()
    }

    render(
      <ErrorBoundary>
        <ThrowNullMessage />
      </ErrorBoundary>
    )

    expect(screen.getByText('抱歉，页面遇到了一些问题')).toBeInTheDocument()
  })
})

describe('ModuleErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应该正常渲染子组件', () => {
    render(
      <ModuleErrorBoundary moduleName="TestModule">
        <div>模块内容</div>
      </ModuleErrorBoundary>
    )

    expect(screen.getByText('模块内容')).toBeInTheDocument()
  })

  it('子组件出错时应该显示错误界面', () => {
    render(
      <ModuleErrorBoundary moduleName="TestModule">
        <ThrowingComponent shouldThrow={true} />
      </ModuleErrorBoundary>
    )

    expect(screen.getByText('页面出错了')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    const buttonTexts = buttons.map(b => b.textContent)
    expect(buttonTexts.some(t => t?.includes('重新加载模块'))).toBe(true)
  })
})
