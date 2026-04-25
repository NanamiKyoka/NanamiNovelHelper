import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Empty, ListEmpty, SearchEmpty, FolderEmpty } from '@renderer/components/common/Empty/Empty'

function findButtonByText(text: string): HTMLElement | undefined {
  return screen
    .getAllByRole('button')
    .find((b) => b.textContent?.replace(/\s+/g, '').includes(text.replace(/\s+/g, '')))
}

describe('Empty', () => {
  it('应该渲染默认空状态', () => {
    render(<Empty />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('应该渲染指定类型的预设描述', () => {
    render(<Empty type="list" />)
    expect(screen.getByText('列表为空')).toBeInTheDocument()
  })

  it('应该渲染搜索类型的预设描述', () => {
    render(<Empty type="search" />)
    expect(screen.getByText('未找到匹配结果')).toBeInTheDocument()
  })

  it('应该渲染文件夹类型的预设描述', () => {
    render(<Empty type="folder" />)
    expect(screen.getByText('文件夹为空')).toBeInTheDocument()
  })

  it('应该渲染用户类型的预设描述', () => {
    render(<Empty type="user" />)
    expect(screen.getByText('暂无用户数据')).toBeInTheDocument()
  })

  it('自定义描述应该覆盖预设描述', () => {
    render(<Empty type="list" description="自定义空状态描述" />)
    expect(screen.getByText('自定义空状态描述')).toBeInTheDocument()
    expect(screen.queryByText('列表为空')).not.toBeInTheDocument()
  })

  it('有actionText和onAction时应该显示操作按钮', () => {
    const onAction = vi.fn()
    render(<Empty actionText="添加新项目" onAction={onAction} />)
    expect(findButtonByText('添加新项目')).toBeInTheDocument()
  })

  it('没有onAction时不应显示操作按钮', () => {
    render(<Empty actionText="添加新项目" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('点击操作按钮应该调用onAction', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<Empty actionText="添加" onAction={onAction} />)

    const btn = findButtonByText('添加')
    expect(btn).toBeDefined()
    await user.click(btn!)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('应该支持自定义图标', () => {
    render(<Empty icon={<span data-testid="custom-icon">图标</span>} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })
})

describe('ListEmpty', () => {
  it('应该渲染列表空状态', () => {
    render(<ListEmpty />)
    expect(screen.getByText('列表为空，点击按钮添加新项目')).toBeInTheDocument()
  })

  it('有onAction时应该显示添加按钮', () => {
    const onAction = vi.fn()
    render(<ListEmpty onAction={onAction} />)
    expect(findButtonByText('添加')).toBeInTheDocument()
  })

  it('没有onAction时不应显示添加按钮', () => {
    render(<ListEmpty />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('应该支持自定义描述', () => {
    render(<ListEmpty description="没有数据" />)
    expect(screen.getByText('没有数据')).toBeInTheDocument()
  })

  it('应该支持自定义按钮文字', () => {
    const onAction = vi.fn()
    render(<ListEmpty actionText="新建" onAction={onAction} />)
    expect(findButtonByText('新建')).toBeInTheDocument()
  })
})

describe('SearchEmpty', () => {
  it('没有关键词时应该显示默认提示', () => {
    render(<SearchEmpty />)
    expect(screen.getByText('请输入搜索关键词')).toBeInTheDocument()
  })

  it('有关键词时应该显示搜索结果提示', () => {
    render(<SearchEmpty keyword="张三" />)
    expect(screen.getByText(/张三/)).toBeInTheDocument()
    expect(screen.getByText(/未找到与"张三"相关的结果/)).toBeInTheDocument()
  })
})

describe('FolderEmpty', () => {
  it('应该渲染文件夹空状态', () => {
    render(<FolderEmpty />)
    expect(screen.getByText('文件夹为空')).toBeInTheDocument()
  })

  it('有onAction时应该显示新建文件按钮', () => {
    const onAction = vi.fn()
    render(<FolderEmpty onAction={onAction} />)
    expect(findButtonByText('新建文件')).toBeInTheDocument()
  })

  it('没有onAction时不应显示按钮', () => {
    render(<FolderEmpty />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('应该支持自定义按钮文字', () => {
    const onAction = vi.fn()
    render(<FolderEmpty actionText="创建文档" onAction={onAction} />)
    expect(findButtonByText('创建文档')).toBeInTheDocument()
  })
})
