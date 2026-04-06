# -*- coding: utf-8 -*-
"""
关系图查询工具
支持查询图列表、图详情、节点、边等
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file
from utils.file_utils import get_relationships_dir, get_relationship_path


class RelationshipQueryTool(BaseTool):
    """关系图查询工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'list_graphs')
        
        if action == 'list_graphs':
            return self._list_graphs()
        elif action == 'get_graph':
            return self._get_graph()
        elif action == 'get_node':
            return self._get_node()
        elif action == 'get_edge':
            return self._get_edge()
        elif action == 'search_nodes':
            return self._search_nodes()
        elif action == 'get_relations':
            return self._get_relations()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _list_graphs(self) -> ToolResult:
        """列出所有关系图"""
        rel_dir = get_relationships_dir(self.project_path)
        
        if not os.path.exists(rel_dir):
            return ToolResult(success=True, data={'graphs': [], 'total': 0})
        
        try:
            graphs = []
            for filename in os.listdir(rel_dir):
                if filename.endswith('.json5'):
                    graph_path = os.path.join(rel_dir, filename)
                    graph = load_json5_file(graph_path)
                    
                    # 简化返回
                    graphs.append({
                        'id': graph.get('id'),
                        'name': graph.get('name'),
                        'description': graph.get('description'),
                        'nodeCount': len(graph.get('nodes', [])),
                        'edgeCount': len(graph.get('edges', [])),
                        'createdAt': graph.get('createdAt'),
                        'updatedAt': graph.get('updatedAt')
                    })
            
            # 按更新时间排序
            graphs.sort(key=lambda x: x.get('updatedAt', ''), reverse=True)
            
            return ToolResult(
                success=True,
                data={'graphs': graphs, 'total': len(graphs)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'读取关系图列表失败: {e}')
    
    def _get_graph(self) -> ToolResult:
        """获取单个关系图详情"""
        graph_id = self.get_required_param('graphId')
        include_nodes = self.get_param('includeNodes', True)
        include_edges = self.get_param('includeEdges', True)
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error=f'关系图不存在: {graph_id}')
        
        try:
            graph = load_json5_file(graph_path)
            
            result = {
                'id': graph.get('id'),
                'name': graph.get('name'),
                'description': graph.get('description'),
                'linkedVocabularyTypes': graph.get('linkedVocabularyTypes', []),
                'customRelationTypes': graph.get('customRelationTypes', []),
                'nodeStyle': graph.get('nodeStyle', 'circle'),
                'nodeCount': len(graph.get('nodes', [])),
                'edgeCount': len(graph.get('edges', [])),
                'createdAt': graph.get('createdAt'),
                'updatedAt': graph.get('updatedAt')
            }
            
            if include_nodes:
                result['nodes'] = graph.get('nodes', [])
            
            if include_edges:
                result['edges'] = graph.get('edges', [])
            
            return ToolResult(success=True, data={'graph': result})
        except Exception as e:
            return ToolResult(success=False, error=f'读取关系图失败: {e}')
    
    def _get_node(self) -> ToolResult:
        """获取单个节点"""
        graph_id = self.get_required_param('graphId')
        node_id = self.get_required_param('nodeId')
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='关系图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            nodes = graph.get('nodes', [])
            node = next((n for n in nodes if n.get('id') == node_id), None)
            
            if node:
                # 获取该节点的所有关系边
                edges = graph.get('edges', [])
                related_edges = [
                    e for e in edges 
                    if e.get('source') == node_id or e.get('target') == node_id
                ]
                
                return ToolResult(
                    success=True,
                    data={
                        'node': node,
                        'relatedEdges': related_edges
                    }
                )
            else:
                return ToolResult(success=False, error=f'节点不存在: {node_id}')
        except Exception as e:
            return ToolResult(success=False, error=f'查询节点失败: {e}')
    
    def _get_edge(self) -> ToolResult:
        """获取单条边"""
        graph_id = self.get_required_param('graphId')
        edge_id = self.get_required_param('edgeId')
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='关系图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            edges = graph.get('edges', [])
            edge = next((e for e in edges if e.get('id') == edge_id), None)
            
            if edge:
                return ToolResult(success=True, data={'edge': edge})
            else:
                return ToolResult(success=False, error=f'边不存在: {edge_id}')
        except Exception as e:
            return ToolResult(success=False, error=f'查询边失败: {e}')
    
    def _search_nodes(self) -> ToolResult:
        """搜索节点"""
        keyword = self.get_param('keyword', '').lower()
        graph_id = self.get_param('graphId')  # 可选，限制搜索范围
        
        if not keyword:
            return ToolResult(success=False, error='请提供搜索关键词')
        
        rel_dir = get_relationships_dir(self.project_path)
        if not os.path.exists(rel_dir):
            return ToolResult(success=True, data={'nodes': [], 'total': 0})
        
        try:
            matched_nodes = []
            
            # 确定要搜索的图
            if graph_id:
                graph_files = [f'{graph_id}.json5']
            else:
                graph_files = [f for f in os.listdir(rel_dir) if f.endswith('.json5')]
            
            for filename in graph_files:
                graph_path = os.path.join(rel_dir, filename)
                graph = load_json5_file(graph_path)
                
                for node in graph.get('nodes', []):
                    if keyword in node.get('name', '').lower():
                        node['_graphId'] = graph.get('id')
                        node['_graphName'] = graph.get('name')
                        matched_nodes.append(node)
            
            return ToolResult(
                success=True,
                data={'nodes': matched_nodes, 'total': len(matched_nodes)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'搜索失败: {e}')
    
    def _get_relations(self) -> ToolResult:
        """获取两个节点之间的关系"""
        graph_id = self.get_required_param('graphId')
        node_id_1 = self.get_required_param('nodeId1')
        node_id_2 = self.get_param('nodeId2')  # 可选，不提供则返回所有关系
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='关系图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            edges = graph.get('edges', [])
            
            if node_id_2:
                # 查找两个特定节点之间的关系
                relations = [
                    e for e in edges
                    if (e.get('source') == node_id_1 and e.get('target') == node_id_2) or
                       (e.get('source') == node_id_2 and e.get('target') == node_id_1)
                ]
            else:
                # 返回节点的所有关系
                relations = [
                    e for e in edges
                    if e.get('source') == node_id_1 or e.get('target') == node_id_1
                ]
            
            return ToolResult(
                success=True,
                data={'relations': relations, 'total': len(relations)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'查询关系失败: {e}')


if __name__ == '__main__':
    run_tool(RelationshipQueryTool)
