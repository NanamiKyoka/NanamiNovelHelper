import { describe, it, expect, beforeEach } from 'vitest'
import { useTimelineStore } from '@renderer/stores/timelineStore'
import type {
  Timeline,
  TimelineMeta,
  TimelineNode,
  TimelineHistoryAction
} from '@renderer/types/timeline'

function createNode(
  overrides: Partial<TimelineNode> & { id: string; title: string }
): TimelineNode {
  return {
    description: '',
    timeInfo: { format: 'datetime', datetime: '2024-01-01T00:00:00Z' },
    characters: [],
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

function createTimelineMeta(
  overrides: Partial<TimelineMeta> & { id: string; name: string }
): TimelineMeta {
  return {
    description: '',
    branchInfo: { type: 'main' },
    nodeCount: 0,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

function setupStore() {
  const nodes: TimelineNode[] = [
    createNode({
      id: 'node1',
      title: '事件1',
      timeInfo: { format: 'datetime', datetime: '2024-01-15T10:00:00Z' },
      order: 0
    }),
    createNode({
      id: 'node2',
      title: '事件2',
      timeInfo: { format: 'datetime', datetime: '2024-02-20T14:00:00Z' },
      order: 1
    }),
    createNode({
      id: 'node3',
      title: '事件3',
      timeInfo: { format: 'chapter', chapterId: 'ch1', chapterTitle: '第一章' },
      order: 2
    })
  ]

  const timeline: Timeline = {
    id: 'timeline-1',
    name: '测试时间线',
    description: '',
    branchInfo: { type: 'main' },
    nodeCount: nodes.length,
    order: 0,
    nodes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  useTimelineStore.setState({
    currentTimeline: timeline,
    timelines: [
      createTimelineMeta({ id: 'timeline-1', name: '测试时间线', nodeCount: nodes.length })
    ],
    isLoading: false,
    error: null,
    history: [],
    historyIndex: -1,
    selectedNodeIds: []
  })
}

describe('TimelineStore - 辅助查询方法', () => {
  beforeEach(() => {
    useTimelineStore.setState({
      timelines: [],
      currentTimeline: null,
      isLoading: false,
      error: null,
      history: [],
      historyIndex: -1,
      selectedNodeIds: []
    })
  })

  describe('getNodeById', () => {
    it('应该返回指定ID的节点', () => {
      setupStore()
      const store = useTimelineStore.getState()
      const node = store.getNodeById('node1')
      expect(node).toBeDefined()
      expect(node?.title).toBe('事件1')
    })

    it('不存在的ID应返回undefined', () => {
      setupStore()
      const store = useTimelineStore.getState()
      expect(store.getNodeById('nonexistent')).toBeUndefined()
    })

    it('无当前时间线时应返回undefined', () => {
      const store = useTimelineStore.getState()
      expect(store.getNodeById('any')).toBeUndefined()
    })
  })

  describe('getNodesByTimeRange', () => {
    it('应该返回时间范围内的节点', () => {
      setupStore()
      const store = useTimelineStore.getState()
      const nodes = store.getNodesByTimeRange('2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z')
      expect(nodes.length).toBe(1)
      expect(nodes[0].id).toBe('node1')
    })

    it('应该返回跨月份的节点', () => {
      setupStore()
      const store = useTimelineStore.getState()
      const nodes = store.getNodesByTimeRange('2024-01-01T00:00:00Z', '2024-03-31T23:59:59Z')
      expect(nodes.length).toBe(2)
    })

    it('范围外应返回空数组', () => {
      setupStore()
      const store = useTimelineStore.getState()
      const nodes = store.getNodesByTimeRange('2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z')
      expect(nodes).toEqual([])
    })

    it('无当前时间线时应返回空数组', () => {
      const store = useTimelineStore.getState()
      expect(store.getNodesByTimeRange('2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z')).toEqual([])
    })
  })

  describe('clearData', () => {
    it('应该重置所有状态', () => {
      setupStore()
      const store = useTimelineStore.getState()
      store.clearData()

      const state = useTimelineStore.getState()
      expect(state.timelines).toEqual([])
      expect(state.currentTimeline).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.history).toEqual([])
      expect(state.historyIndex).toBe(-1)
      expect(state.selectedNodeIds).toEqual([])
    })
  })

  describe('setTimelines', () => {
    it('应该设置时间线列表并清除加载状态', () => {
      const store = useTimelineStore.getState()
      const timelines = [createTimelineMeta({ id: 't1', name: '时间线1', nodeCount: 0 })]
      store.setTimelines(timelines)

      const state = useTimelineStore.getState()
      expect(state.timelines).toEqual(timelines)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('clearCurrentTimeline', () => {
    it('应该清除当前时间线', () => {
      setupStore()
      const store = useTimelineStore.getState()
      store.clearCurrentTimeline()

      const state = useTimelineStore.getState()
      expect(state.currentTimeline).toBeNull()
    })
  })

  describe('clearSelection', () => {
    it('应该清除选中节点', () => {
      setupStore()
      useTimelineStore.setState({ selectedNodeIds: ['node1', 'node2'] })
      const store = useTimelineStore.getState()
      store.clearSelection()

      const state = useTimelineStore.getState()
      expect(state.selectedNodeIds).toEqual([])
    })
  })

  describe('clearHistory', () => {
    it('应该清除历史记录', () => {
      setupStore()
      useTimelineStore.setState({
        history: [{ type: 'addNode', data: {} }] satisfies TimelineHistoryAction[],
        historyIndex: 0
      })
      const store = useTimelineStore.getState()
      store.clearHistory()

      const state = useTimelineStore.getState()
      expect(state.history).toEqual([])
      expect(state.historyIndex).toBe(-1)
    })
  })
})
