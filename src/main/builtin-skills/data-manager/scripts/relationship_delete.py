# -*- coding: utf-8 -*-
"""
关系图删除工具
支持删除图、节点、边
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file, save_json5_file
from utils.file_utils import get_relationship_path


class RelationshipDeleteTool(BaseTool):
    """关系图删除工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'delete_graph')
        
        if action == 'delete_graph':
            return self._delete_graph()
        elif action == 'delete_node':
            return self._delete_node()
        elif action == 'delete_edge':
            return self._delete_edge()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _delete_graph(self) -> ToolResult:
        """删除整个关系图"""
        graph_id = self.get_required_param('graphId')
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error=f'关系图不存在: {graph_id}')
        
        try:
            # 读取图信息用于返回
            graph = load_json5_file(graph_path)
            graph_name = graph.get('name', graph_id)
            
            # 删除数据文件
            os.remove(graph_path)
            
            # 删除缩略图（如果存在）
            thumb_path = graph_path.replace('.json5', '.png')
            if os.path.exists(thumb_path):
                os.remove(thumb_path)
            
            return ToolResult(
                success=True,
                data={'deletedId': graph_id, 'deletedName': graph_name},
                message=f'成功删除关系图: {graph_name}'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'删除失败: {e}')
    
    def _delete_node(self) -> ToolResult:
        """删除节点（同时删除相关的边）"""
        graph_id = self.get_required_param('graphId')
        node_id = self.get_required_param('nodeId')
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='关系图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            nodes = graph.get('nodes', [])
            edges = graph.get('edges', [])
            
            # 查找节点
            node_index = next((i for i, n in enumerate(nodes) if n.get('id') == node_id), None)
            if node_index is None:
                return ToolResult(success=False, error=f'节点不存在: {node_id}')
            
            deleted_node = nodes[node_index]
            node_name = deleted_node.get('name', node_id)
            
            # 删除节点
            nodes.pop(node_index)
            
            # 删除与该节点相关的所有边
            remaining_edges = [
                e for e in edges 
                if e.get('source') != node_id and e.get('target') != node_id
            ]
            deleted_edge_count = len(edges) - len(remaining_edges)
            
            now = self.get_timestamp()
            graph['nodes'] = nodes
            graph['edges'] = remaining_edges
            graph['nodeCount'] = len(nodes)
            graph['edgeCount'] = len(remaining_edges)
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            return ToolResult(
                success=True,
                data={
                    'deletedNodeId': node_id,
                    'deletedNodeName': node_name,
                    'deletedEdgeCount': deleted_edge_count
                },
                message=f'成功删除节点: {node_name}（同时删除 {deleted_edge_count} 条关系）'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'删除节点失败: {e}')
    
    def _delete_edge(self) -> ToolResult:
        """删除边"""
        graph_id = self.get_required_param('graphId')
        edge_id = self.get_required_param('edgeId')
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='关系图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            edges = graph.get('edges', [])
            
            # 查找边
            edge_index = next((i for i, e in enumerate(edges) if e.get('id') == edge_id), None)
            if edge_index is None:
                return ToolResult(success=False, error=f'边不存在: {edge_id}')
            
            edges.pop(edge_index)
            
            now = self.get_timestamp()
            graph['edges'] = edges
            graph['edgeCount'] = len(edges)
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            return ToolResult(
                success=True,
                data={'deletedEdgeId': edge_id},
                message='成功删除关系'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'删除关系失败: {e}')


if __name__ == '__main__':
    run_tool(RelationshipDeleteTool)
