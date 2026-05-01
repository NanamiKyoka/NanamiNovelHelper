import { describe, it, expect, beforeEach } from 'vitest'
import { useRelationshipStore } from '@renderer/stores/relationshipStore'
import type {
  RelationshipNode,
  RelationshipEdge,
  RelationshipGraph,
  RelationshipGraphMeta
} from '@shared/relationship'

function createNode(
  overrides: Partial<RelationshipNode> & { id: string; name: string }
): RelationshipNode {
  return {
    gender: 'unknown',
    color: '#1890ff',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

function createEdge(
  overrides: Partial<RelationshipEdge> & {
    id: string
    source: string
    target: string
    relationTypeId: string
  }
): RelationshipEdge {
  return {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

function createGraphMeta(
  overrides: Partial<RelationshipGraphMeta> & { id: string; name: string }
): RelationshipGraphMeta {
  return {
    description: '',
    linkedVocabularyTypes: [],
    customRelationTypes: [],
    nodeStyle: 'circle',
    nodeCount: 0,
    edgeCount: 0,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

function setupStore() {
  const nodes: RelationshipNode[] = [
    createNode({ id: 'n1', name: '张三', gender: 'male' }),
    createNode({ id: 'n2', name: '李四', gender: 'female' }),
    createNode({ id: 'n3', name: '王五', gender: 'male' })
  ]

  const edges: RelationshipEdge[] = [
    createEdge({ id: 'e1', source: 'n1', target: 'n2', relationTypeId: 'friend' }),
    createEdge({ id: 'e2', source: 'n2', target: 'n3', relationTypeId: 'enemy' })
  ]

  const graph: RelationshipGraph = {
    id: 'graph-1',
    name: '测试关系图',
    description: '',
    linkedVocabularyTypes: [],
    customRelationTypes: [],
    nodeStyle: 'circle',
    nodeCount: nodes.length,
    edgeCount: edges.length,
    order: 0,
    nodes,
    edges,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  useRelationshipStore.setState({
    currentGraph: graph,
    graphs: [
      createGraphMeta({
        id: 'graph-1',
        name: '测试关系图',
        nodeCount: nodes.length,
        edgeCount: edges.length
      })
    ],
    isLoading: false,
    error: null
  })
}

describe('RelationshipStore - 辅助查询方法', () => {
  beforeEach(() => {
    useRelationshipStore.setState({
      graphs: [],
      currentGraph: null,
      isLoading: false,
      error: null
    })
  })

  describe('getNodeById', () => {
    it('应该返回指定ID的节点', () => {
      setupStore()
      const store = useRelationshipStore.getState()
      const node = store.getNodeById('n1')
      expect(node).toBeDefined()
      expect(node?.name).toBe('张三')
    })

    it('不存在的ID应返回undefined', () => {
      setupStore()
      const store = useRelationshipStore.getState()
      expect(store.getNodeById('nonexistent')).toBeUndefined()
    })

    it('无当前图时应返回undefined', () => {
      const store = useRelationshipStore.getState()
      expect(store.getNodeById('any')).toBeUndefined()
    })
  })

  describe('getEdgeById', () => {
    it('应该返回指定ID的边', () => {
      setupStore()
      const store = useRelationshipStore.getState()
      const edge = store.getEdgeById('e1')
      expect(edge).toBeDefined()
      expect(edge?.source).toBe('n1')
      expect(edge?.target).toBe('n2')
    })

    it('不存在的ID应返回undefined', () => {
      setupStore()
      const store = useRelationshipStore.getState()
      expect(store.getEdgeById('nonexistent')).toBeUndefined()
    })

    it('无当前图时应返回undefined', () => {
      const store = useRelationshipStore.getState()
      expect(store.getEdgeById('any')).toBeUndefined()
    })
  })

  describe('getRelationTypeById', () => {
    it('应该返回内置关系类型', () => {
      setupStore()
      const store = useRelationshipStore.getState()
      const types = store.getRelationTypes()
      if (types.length > 0) {
        const firstType = store.getRelationTypeById(types[0].id)
        expect(firstType).toBeDefined()
        expect(firstType?.id).toBe(types[0].id)
      }
    })

    it('不存在的ID应返回undefined', () => {
      setupStore()
      const store = useRelationshipStore.getState()
      expect(store.getRelationTypeById('nonexistent')).toBeUndefined()
    })
  })

  describe('clearData', () => {
    it('应该重置所有状态', () => {
      setupStore()
      const store = useRelationshipStore.getState()
      store.clearData()

      const state = useRelationshipStore.getState()
      expect(state.graphs).toEqual([])
      expect(state.currentGraph).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('setGraphs', () => {
    it('应该设置图列表并清除加载状态', () => {
      const store = useRelationshipStore.getState()
      const graphs = [createGraphMeta({ id: 'g1', name: '图1', nodeCount: 0, edgeCount: 0 })]
      store.setGraphs(graphs)

      const state = useRelationshipStore.getState()
      expect(state.graphs).toEqual(graphs)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('clearCurrentGraph', () => {
    it('应该清除当前图', () => {
      setupStore()
      const store = useRelationshipStore.getState()
      store.clearCurrentGraph()

      const state = useRelationshipStore.getState()
      expect(state.currentGraph).toBeNull()
    })
  })
})
