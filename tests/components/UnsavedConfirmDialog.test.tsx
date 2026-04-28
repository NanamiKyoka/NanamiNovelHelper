import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

let capturedProps: any = null

vi.mock('antd', async importOriginal => {
  const actual = await importOriginal<typeof import('antd')>()
  return {
    ...actual,
    Modal: (props: any) => {
      capturedProps = props
      return (
        <div data-testid="mock-modal">
          <div data-testid="modal-title">
            {React.Children.toArray(props.title?.props?.children)
              .filter((child: any) => child?.props?.children)
              .map((child: any, i: number) => (
                <span key={i}>{child.props.children}</span>
              ))}
          </div>
          <span data-testid="ok-text">{props.okText}</span>
          <span data-testid="cancel-text">{props.cancelText}</span>
          <span data-testid="ok-type">{props.okType}</span>
          <span data-testid="confirm-loading">{String(props.confirmLoading)}</span>
          <span data-testid="mask-closable">{String(props.maskClosable)}</span>
          <div data-testid="modal-content">{props.children}</div>
          <div data-testid="modal-footer">
            {props.footer?.map((btn: any, i: number) => (
              <button
                key={i}
                data-testid={`footer-btn-${i}`}
                onClick={btn.props.onClick}
                disabled={btn.props.disabled}
                aria-label={btn.props['aria-label']}
              >
                {btn.props.children}
              </button>
            ))}
          </div>
        </div>
      )
    }
  }
})

import { UnsavedConfirmDialog } from '@renderer/components/common/ConfirmDialog/ConfirmDialog'

describe('UnsavedConfirmDialog', () => {
  beforeEach(() => {
    capturedProps = null
  })

  it('应该传递正确的props给Modal', () => {
    const onSave = vi.fn()
    const onDiscard = vi.fn()
    const onCancel = vi.fn()

    render(<UnsavedConfirmDialog onSave={onSave} onDiscard={onDiscard} onCancel={onCancel} />)

    expect(capturedProps).not.toBeNull()
    expect(capturedProps.okText).toBe('保存')
    expect(capturedProps.cancelText).toBe('取消')
    expect(capturedProps.okType).toBe('primary')
    expect(capturedProps.maskClosable).toBe(false)
  })

  it('应该渲染未保存提示文案', () => {
    render(<UnsavedConfirmDialog />)

    expect(screen.getByTestId('modal-content').textContent).toContain(
      '当前有未保存的更改，是否保存？'
    )
  })

  it('应该渲染标题中的未保存更改文本', () => {
    render(<UnsavedConfirmDialog />)

    const title = screen.getByTestId('modal-title')
    expect(title.textContent).toContain('未保存的更改')
  })

  it('应该渲染三个操作按钮', () => {
    render(<UnsavedConfirmDialog />)

    const footer = screen.getByTestId('modal-footer')
    const buttons = footer.querySelectorAll('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0].textContent).toContain('不保存')
    expect(buttons[1].textContent).toContain('取消')
    expect(buttons[2].textContent).toContain('保存')
  })

  it('点击不保存按钮应该调用onDiscard', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    render(<UnsavedConfirmDialog onDiscard={onDiscard} />)

    await user.click(screen.getByTestId('footer-btn-0'))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it('点击取消按钮应该调用onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<UnsavedConfirmDialog onCancel={onCancel} />)

    await user.click(screen.getByTestId('footer-btn-1'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('点击保存按钮应该调用onSave', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<UnsavedConfirmDialog onSave={onSave} />)

    await user.click(screen.getByTestId('footer-btn-2'))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('loading状态下保存按钮应禁用且文本变化', () => {
    render(<UnsavedConfirmDialog loading={true} />)

    expect(capturedProps.confirmLoading).toBe(true)

    const saveBtn = screen.getByTestId('footer-btn-2')
    expect(saveBtn.disabled).toBe(true)
    expect(saveBtn.textContent).toContain('保存中')
  })

  it('按钮应该有正确的aria-label', () => {
    render(<UnsavedConfirmDialog />)

    expect(screen.getByTestId('footer-btn-0').getAttribute('aria-label')).toBe('不保存并关闭')
    expect(screen.getByTestId('footer-btn-1').getAttribute('aria-label')).toBe('取消操作')
    expect(screen.getByTestId('footer-btn-2').getAttribute('aria-label')).toBe('保存更改')
  })
})
