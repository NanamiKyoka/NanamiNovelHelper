import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ConfirmDialog,
  DeleteConfirmDialog
} from '@renderer/components/common/ConfirmDialog/ConfirmDialog'

function findButtonByText(text: string): HTMLElement | undefined {
  return screen
    .getAllByRole('button')
    .find(b => b.textContent?.replace(/\s+/g, '').includes(text.replace(/\s+/g, '')))
}

describe('ConfirmDialog', () => {
  it('应该渲染标题和内容', () => {
    render(
      <ConfirmDialog open title="确认操作" type="confirm">
        确认执行此操作吗？
      </ConfirmDialog>
    )

    expect(screen.getByText('确认操作')).toBeInTheDocument()
    expect(screen.getByText('确认执行此操作吗？')).toBeInTheDocument()
  })

  it('应该显示默认的确认和取消按钮', () => {
    render(
      <ConfirmDialog open title="测试" type="confirm">
        内容
      </ConfirmDialog>
    )

    expect(findButtonByText('确定')).toBeInTheDocument()
    expect(findButtonByText('取消')).toBeInTheDocument()
  })

  it('应该支持自定义按钮文字', () => {
    render(
      <ConfirmDialog open title="测试" type="confirm" confirmText="是的" cancelText="不了">
        内容
      </ConfirmDialog>
    )

    expect(findButtonByText('是的')).toBeInTheDocument()
    expect(findButtonByText('不了')).toBeInTheDocument()
  })

  it('点击确认按钮应该调用onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog open title="测试" type="confirm" onConfirm={onConfirm}>
        内容
      </ConfirmDialog>
    )

    const confirmBtn = findButtonByText('确定')
    expect(confirmBtn).toBeDefined()
    await user.click(confirmBtn!)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('点击取消按钮应该调用onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog open title="测试" type="confirm" onCancel={onCancel}>
        内容
      </ConfirmDialog>
    )

    const cancelBtn = findButtonByText('取消')
    expect(cancelBtn).toBeDefined()
    await user.click(cancelBtn!)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('未打开时不应显示内容', () => {
    render(
      <ConfirmDialog open={false} title="测试" type="confirm">
        隐藏内容
      </ConfirmDialog>
    )

    expect(screen.queryByText('测试')).not.toBeInTheDocument()
  })

  it('应该支持不同的对话框类型', () => {
    const { rerender } = render(
      <ConfirmDialog open title="测试" type="confirm">
        内容
      </ConfirmDialog>
    )
    expect(screen.getByText('测试')).toBeInTheDocument()

    rerender(
      <ConfirmDialog open title="危险操作" type="danger">
        内容
      </ConfirmDialog>
    )
    expect(screen.getByText('危险操作')).toBeInTheDocument()
  })

  it('loading状态应该显示加载样式', () => {
    render(
      <ConfirmDialog open title="测试" type="confirm" loading={true}>
        内容
      </ConfirmDialog>
    )

    const confirmBtn = findButtonByText('确定')
    expect(confirmBtn?.className).toContain('loading')
  })
})

describe('DeleteConfirmDialog', () => {
  it('应该渲染默认的删除确认文案', () => {
    render(<DeleteConfirmDialog open>此操作不可撤销，确定要删除吗？</DeleteConfirmDialog>)

    expect(screen.getByText('确认删除')).toBeInTheDocument()
    expect(screen.getByText('此操作不可撤销，确定要删除吗？')).toBeInTheDocument()
  })

  it('应该显示删除按钮', () => {
    render(<DeleteConfirmDialog open>内容</DeleteConfirmDialog>)

    expect(findButtonByText('删除')).toBeInTheDocument()
  })

  it('应该支持自定义标题和内容', () => {
    render(
      <DeleteConfirmDialog open title="删除项目" content="确定删除该项目？">
        {undefined}
      </DeleteConfirmDialog>
    )

    expect(screen.getByText('删除项目')).toBeInTheDocument()
    expect(screen.getByText('确定删除该项目？')).toBeInTheDocument()
  })

  it('点击删除应该调用onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <DeleteConfirmDialog open onConfirm={onConfirm}>
        内容
      </DeleteConfirmDialog>
    )

    const deleteBtn = findButtonByText('删除')
    expect(deleteBtn).toBeDefined()
    await user.click(deleteBtn!)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
