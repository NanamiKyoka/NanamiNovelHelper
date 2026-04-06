# -*- coding: utf-8 -*-
"""
组织架构图删除工具
支持删除图、节点（及子孙节点）
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file, save_json5_file
from utils.file_utils import get_organization_path


class OrganizationDeleteTool(BaseTool):
    """组织架构图删除工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'delete_graph')
        
        if action == 'delete_graph':
            return self._delete_graph()
        elif action == 'delete_node':
            return self._delete_node()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _delete_graph(self) -> ToolResult:
        """删除整个组织架构图"""
        graph_id = self.get_required_param('graphId')
        
        graph_path = get_organization_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error=f'组织架构图不存在: {graph_id}')
        
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
                message=f'成功删除组织架构图: {graph_name}'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'删除失败: {e}')
    
    def _delete_node(self) -> ToolResult:
        """删除节点及其所有子孙节点"""
        graph_id = self.get_required_param('graphId')
        node_id = self.get_required_param('nodeId')
        
        graph_path = get_organization_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='组织架构图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            nodes = graph.get('nodes', [])
            
            # 查找节点
            node_index = next((i for i, n in enumerate(nodes) if n.get('id') == node_id), None)
            if node_index is None:
                return ToolResult(success=False, error=f'节点不存在: {node_id}')
            
            deleted_node = nodes[node_index]
            node_name = deleted_node.get('name', node_id)
            
            # 获取所有要删除的节点 ID（包含子孙节点）
            ids_to_delete = self._get_descendant_ids(nodes, node_id)
            ids_to_delete.append(node_id)
            
            # 过滤掉要删除的节点
            remaining_nodes = [n for n in nodes if n.get('id') not in ids_to_delete]
            
            now = self.get_timestamp()
            graph['nodes'] = remaining_nodes
            graph['nodeCount'] = len(remaining_nodes)
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            deleted_count = len(ids_to_delete)
            
            return ToolResult(
                success=True,
                data={
                    'deletedNodeId': node_id,
                    'deletedNodeName': node_name,
                    'deletedCount': deleted_count
                },
                message=f'成功删除节点: {node_name}（共删除 {deleted_count} 个节点）'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'删除节点失败: {e}')
    
    def _get_descendant_ids(self, nodes, parent_id):
        """递归获取所有子孙节点 ID"""
        result = []
        children = [n for n in nodes if n.get('parentId') == parent_id]
        for child in children:
            result.append(child.get('id'))
            result.extend(self._get_descendant_ids(nodes, child.get('id')))
        return result


if __name__ == '__main__':
    run_tool(OrganizationDeleteTool)
