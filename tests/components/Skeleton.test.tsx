import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  SkeletonLoader,
  ListSkeleton,
  CardSkeleton,
  TableSkeleton,
  TextSkeleton
} from '@components/common/Skeleton/Skeleton'

describe('SkeletonLoader', () => {
  it('应该渲染text变体', () => {
    const { container } = render(<SkeletonLoader variant="text" />)
    expect(container.querySelector('.ant-skeleton')).toBeTruthy()
  })

  it('应该渲染card变体', () => {
    const { container } = render(<SkeletonLoader variant="card" />)
    expect(container.querySelector('.ant-skeleton-image')).toBeTruthy()
  })

  it('应该渲染list变体', () => {
    const { container } = render(<SkeletonLoader variant="list" rows={3} />)
    const avatars = container.querySelectorAll('.ant-skeleton-avatar')
    expect(avatars.length).toBe(3)
  })

  it('应该渲染table变体', () => {
    const { container } = render(<SkeletonLoader variant="table" rows={2} />)
    const inputs = container.querySelectorAll('.ant-skeleton-input')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('默认应为text变体', () => {
    const { container } = render(<SkeletonLoader />)
    expect(container.querySelector('.ant-skeleton')).toBeTruthy()
  })
})

describe('ListSkeleton', () => {
  it('应该渲染指定数量的列表项', () => {
    const { container } = render(<ListSkeleton count={4} />)
    const avatars = container.querySelectorAll('.ant-skeleton-avatar')
    expect(avatars.length).toBe(4)
  })
})

describe('CardSkeleton', () => {
  it('应该渲染卡片骨架', () => {
    const { container } = render(<CardSkeleton count={2} />)
    const images = container.querySelectorAll('.ant-skeleton-image')
    expect(images.length).toBe(2)
  })
})

describe('TableSkeleton', () => {
  it('应该渲染表格骨架', () => {
    const { container } = render(<TableSkeleton rows={3} />)
    expect(container.querySelector('.ant-skeleton-input')).toBeTruthy()
  })
})

describe('TextSkeleton', () => {
  it('应该渲染文本骨架', () => {
    const { container } = render(<TextSkeleton rows={5} />)
    expect(container.querySelector('.ant-skeleton')).toBeTruthy()
  })
})
