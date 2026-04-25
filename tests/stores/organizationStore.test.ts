import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOrganizationStore } from '@renderer/stores/organizationStore'
import type { OrganizationNode, OrganizationGraph } from '@renderer/types/organization'

function createNode(overrides: Partial<OrganizationNode> & { id: string }): OrganizationNode {
  return {
    name: 'Node',
    graphId: 'graph-1',
    parentId: undefined,
    role: '',
    description: '',
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function setupTreeStore() {
  const nodes: OrganizationNode[] = [
    createNode({ id: 'root1', name: '根节点1', parentId: undefined, order: 0 }),
    createNode({ id: 'root2', name: '根节点2', parentId: undefined, order: 1 }),
    createNode({ id: 'child1-1', name: '子节点1-1', parentId: 'root1', order: 0 }),
    createNode({ id: 'child1-2', name: '子节点1-2', parentId: 'root1', order: 1 }),
    createNode({ id: 'child2-1', name: '子节点2-1', parentId: 'root2', order: 0 }),
    createNode({ id: 'grandchild1-1-1', name: '孙节点1-1-1', parentId: 'child1-1', order: 0 }),
    createNode({ id: 'grandchild1-1-2', name: '孙节点1-1-2', parentId: 'child1-1', order: 1 }),
  ]

  const graph: OrganizationGraph = {
    id: 'graph-1',
    name: '测试图',
    description: '',
    nodes,
    nodeCount: nodes.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  useOrganizationStore.setState({
    currentGraph: graph,
    graphs: [
      {
        id: 'graph-1',
        name: '测试图',
        description: '',
        thumbnail: undefined,
        linkedVocabularyTypes: [],
        nodeStyle: undefined,
        nodeCount: nodes.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    isLoading: false,
    error: null,
  })
}

describe('OrganizationStore - 树遍历辅助方法', () => {
  beforeEach(() => {
    useOrganizationStore.setState({
      graphs: [],
      currentGraph: null,
      isLoading: false,
      error: null,
    })
  })

  describe('getNodeById', () => {
    it('应该返回指定ID的节点', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const node = store.getNodeById('root1')
      expect(node).toBeDefined()
      expect(node?.name).toBe('根节点1')
    })

    it('不存在的ID应返回undefined', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const node = store.getNodeById('nonexistent')
      expect(node).toBeUndefined()
    })

    it('无当前图时应返回undefined', () => {
      const store = useOrganizationStore.getState()
      const node = store.getNodeById('any')
      expect(node).toBeUndefined()
    })
  })

  describe('getRootNodes', () => {
    it('应该返回所有根节点（无parentId的节点）', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const roots = store.getRootNodes()
      expect(roots.length).toBe(2)
      expect(roots[0].id).toBe('root1')
      expect(roots[1].id).toBe('root2')
    })

    it('根节点应该按order排序', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const roots = store.getRootNodes()
      expect(roots[0].order).toBeLessThanOrEqual(roots[1].order)
    })

    it('无当前图时应返回空数组', () => {
      const store = useOrganizationStore.getState()
      expect(store.getRootNodes()).toEqual([])
    })
  })

  describe('getChildren', () => {
    it('应该返回指定节点的直接子节点', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const children = store.getChildren('root1')
      expect(children.length).toBe(2)
      expect(children.map((c) => c.id)).toContain('child1-1')
      expect(children.map((c) => c.id)).toContain('child1-2')
    })

    it('子节点应该按order排序', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const children = store.getChildren('root1')
      expect(children[0].order).toBeLessThanOrEqual(children[1].order)
    })

    it('叶子节点应返回空数组', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const children = store.getChildren('grandchild1-1-1')
      expect(children).toEqual([])
    })

    it('不存在的节点应返回空数组', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const children = store.getChildren('nonexistent')
      expect(children).toEqual([])
    })
  })

  describe('getDescendants', () => {
    it('应该返回所有后代节点（递归）', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const descendants = store.getDescendants('root1')
      expect(descendants.length).toBe(4)
      const ids = descendants.map((d) => d.id)
      expect(ids).toContain('child1-1')
      expect(ids).toContain('child1-2')
      expect(ids).toContain('grandchild1-1-1')
      expect(ids).toContain('grandchild1-1-2')
    })

    it('叶子节点应返回空数组', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const descendants = store.getDescendants('grandchild1-1-1')
      expect(descendants).toEqual([])
    })

    it('只有直接子节点的节点应返回子节点', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const descendants = store.getDescendants('root2')
      expect(descendants.length).toBe(1)
      expect(descendants[0].id).toBe('child2-1')
    })

    it('不存在的节点应返回空数组', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      expect(store.getDescendants('nonexistent')).toEqual([])
    })
  })

  describe('getAncestors', () => {
    it('应该返回所有祖先节点', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const ancestors = store.getAncestors('grandchild1-1-1')
      expect(ancestors.length).toBe(2)
      expect(ancestors[0].id).toBe('child1-1')
      expect(ancestors[1].id).toBe('root1')
    })

    it('根节点应返回空数组', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const ancestors = store.getAncestors('root1')
      expect(ancestors).toEqual([])
    })

    it('直接子节点应返回父节点', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      const ancestors = store.getAncestors('child1-1')
      expect(ancestors.length).toBe(1)
      expect(ancestors[0].id).toBe('root1')
    })

    it('不存在的节点应返回空数组', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      expect(store.getAncestors('nonexistent')).toEqual([])
    })
  })

  describe('clearData', () => {
    it('应该重置所有状态', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      store.clearData()

      const state = useOrganizationStore.getState()
      expect(state.graphs).toEqual([])
      expect(state.currentGraph).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('setGraphs', () => {
    it('应该设置图列表并清除加载状态', () => {
      const store = useOrganizationStore.getState()
      const graphs = [
        {
          id: 'g1',
          name: '图1',
          description: '',
          thumbnail: undefined,
          linkedVocabularyTypes: [],
          nodeStyle: undefined,
          nodeCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      store.setGraphs(graphs)

      const state = useOrganizationStore.getState()
      expect(state.graphs).toEqual(graphs)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('clearCurrentGraph', () => {
    it('应该清除当前图', () => {
      setupTreeStore()
      const store = useOrganizationStore.getState()
      store.clearCurrentGraph()

      const state = useOrganizationStore.getState()
      expect(state.currentGraph).toBeNull()
    })
  })
})
