# -*- coding: utf-8 -*-
"""
关系图更新工具
支持更新图信息、节点、边
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file, save_json5_file
from utils.file_utils import get_relationship_path


class RelationshipUpdateTool(BaseTool):
    """关系图更新工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'update_graph')
        
        if action == 'update_graph':
            return self._update_graph()
        elif action == 'update_node':
            return self._update_node()
        elif action == 'update_edge':
            return self._update_edge()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _update_graph(self) -> ToolResult:
        """更新关系图基本信息"""
        graph_id = self.get_required_param('graphId')
        
        updates = {}
        if self.get_param('name') is not None:
            updates['name'] = self.get_param('name').strip()
        if self.get_param('description') is not None:
            updates['description'] = self.get_param('description')
        if self.get_param('linkedVocabularyTypes') is not None:
            updates['linkedVocabularyTypes'] = self.get_param('linkedVocabularyTypes')
        if self.get_param('nodeStyle') is not None:
            updates['nodeStyle'] = self.get_param('nodeStyle')
        
        if not updates:
            return ToolResult(success=False, error='没有提供要更新的字段')
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='关系图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            now = self.get_timestamp()
            
            graph.update(updates)
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            return ToolResult(
                success=True,
                data={'graph': graph},
                message=f'成功更新关系图: {graph.get("name")}'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'更新失败: {e}')
    
    def _update_node(self) -> ToolResult:
        """更新节点"""
        graph_id = self.get_required_param('graphId')
        node_id = self.get_required_param('nodeId')
        
        updates = {}
        if self.get_param('name') is not None:
            updates['name'] = self.get_param('name').strip()
        if self.get_param('gender') is not None:
            updates['gender'] = self.get_param('gender')
        if self.get_param('description') is not None:
            updates['description'] = self.get_param('description')
        if self.get_param('color') is not None:
            updates['color'] = self.get_param('color')
        if self.get_param('avatar') is not None:
            updates['avatar'] = self.get_param('avatar')
        if self.get_param('linkedTypeId') is not None:
            updates['linkedTypeId'] = self.get_param('linkedTypeId')
        if self.get_param('linkedEntryId') is not None:
            updates['linkedEntryId'] = self.get_param('linkedEntryId')
        
        if not updates:
            return ToolResult(success=False, error='没有提供要更新的字段')
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='关系图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            nodes = graph.get('nodes', [])
            node_index = next((i for i, n in enumerate(nodes) if n.get('id') == node_id), None)
            
            if node_index is None:
                return ToolResult(success=False, error=f'节点不存在: {node_id}')
            
            now = self.get_timestamp()
            nodes[node_index].update(updates)
            nodes[node_index]['updatedAt'] = now
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            return ToolResult(
                success=True,
                data={'node': nodes[node_index]},
                message=f'成功更新节点: {nodes[node_index].get("name")}'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'更新节点失败: {e}')
    
    def _update_edge(self) -> ToolResult:
        """更新边"""
        graph_id = self.get_required_param('graphId')
        edge_id = self.get_required_param('edgeId')
        
        updates = {}
        if self.get_param('relationTypeId') is not None:
            updates['relationTypeId'] = self.get_param('relationTypeId')
        if self.get_param('label') is not None:
            updates['label'] = self.get_param('label')
        
        if not updates:
            return ToolResult(success=False, error='没有提供要更新的字段')
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='关系图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            edges = graph.get('edges', [])
            edge_index = next((i for i, e in enumerate(edges) if e.get('id') == edge_id), None)
            
            if edge_index is None:
                return ToolResult(success=False, error=f'边不存在: {edge_id}')
            
            now = self.get_timestamp()
            edges[edge_index].update(updates)
            edges[edge_index]['updatedAt'] = now
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            return ToolResult(
                success=True,
                data={'edge': edges[edge_index]},
                message='成功更新关系'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'更新关系失败: {e}')


if __name__ == '__main__':
    run_tool(RelationshipUpdateTool)
