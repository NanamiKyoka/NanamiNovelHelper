# -*- coding: utf-8 -*-
"""
组织架构图更新工具
支持更新图信息、节点、移动节点
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file, save_json5_file
from utils.file_utils import get_organization_path


class OrganizationUpdateTool(BaseTool):
    """组织架构图更新工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'update_graph')
        
        if action == 'update_graph':
            return self._update_graph()
        elif action == 'update_node':
            return self._update_node()
        elif action == 'move_node':
            return self._move_node()
        elif action == 'toggle_collapse':
            return self._toggle_collapse()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _update_graph(self) -> ToolResult:
        """更新组织架构图基本信息"""
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
        
        graph_path = get_organization_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='组织架构图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            now = self.get_timestamp()
            
            graph.update(updates)
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            return ToolResult(
                success=True,
                data={'graph': graph},
                message=f'成功更新组织架构图: {graph.get("name")}'
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
        if self.get_param('description') is not None:
            updates['description'] = self.get_param('description')
        if self.get_param('color') is not None:
            updates['color'] = self.get_param('color')
        if self.get_param('linkedTypeId') is not None:
            updates['linkedTypeId'] = self.get_param('linkedTypeId')
        if self.get_param('linkedEntryId') is not None:
            updates['linkedEntryId'] = self.get_param('linkedEntryId')
        
        if not updates:
            return ToolResult(success=False, error='没有提供要更新的字段')
        
        graph_path = get_organization_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='组织架构图不存在')
        
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
    
    def _move_node(self) -> ToolResult:
        """移动节点到新的父节点下"""
        graph_id = self.get_required_param('graphId')
        node_id = self.get_required_param('nodeId')
        new_parent_id = self.get_param('newParentId')  # None 表示移动到根级别
        
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
            
            # 不能移动到自己的子孙节点下
            if new_parent_id:
                descendant_ids = self._get_descendant_ids(nodes, node_id)
                if new_parent_id in descendant_ids:
                    return ToolResult(success=False, error='不能将节点移动到自己的子节点下')
                
                # 验证新父节点存在
                if not any(n.get('id') == new_parent_id for n in nodes):
                    return ToolResult(success=False, error=f'目标父节点不存在: {new_parent_id}')
            
            # 计算新的排序值
            siblings = [n for n in nodes if n.get('parentId') == new_parent_id and n.get('id') != node_id]
            max_order = max((n.get('order', -1) for n in siblings), default=-1)
            
            now = self.get_timestamp()
            nodes[node_index]['parentId'] = new_parent_id
            nodes[node_index]['order'] = max_order + 1
            nodes[node_index]['updatedAt'] = now
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            return ToolResult(
                success=True,
                data={'node': nodes[node_index]},
                message=f'成功移动节点: {nodes[node_index].get("name")}'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'移动节点失败: {e}')
    
    def _get_descendant_ids(self, nodes, parent_id):
        """获取所有子孙节点 ID"""
        result = []
        children = [n for n in nodes if n.get('parentId') == parent_id]
        for child in children:
            result.append(child.get('id'))
            result.extend(self._get_descendant_ids(nodes, child.get('id')))
        return result
    
    def _toggle_collapse(self) -> ToolResult:
        """切换节点折叠状态"""
        graph_id = self.get_required_param('graphId')
        node_id = self.get_required_param('nodeId')
        collapsed = self.get_param('collapsed')  # 可选，不提供则切换
        
        graph_path = get_organization_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='组织架构图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            nodes = graph.get('nodes', [])
            node_index = next((i for i, n in enumerate(nodes) if n.get('id') == node_id), None)
            
            if node_index is None:
                return ToolResult(success=False, error=f'节点不存在: {node_id}')
            
            now = self.get_timestamp()
            
            if collapsed is None:
                # 切换状态
                nodes[node_index]['collapsed'] = not nodes[node_index].get('collapsed', False)
            else:
                nodes[node_index]['collapsed'] = collapsed
            
            nodes[node_index]['updatedAt'] = now
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            return ToolResult(
                success=True,
                data={'node': nodes[node_index]},
                message=f'节点折叠状态: {nodes[node_index].get("collapsed")}'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'更新折叠状态失败: {e}')


if __name__ == '__main__':
    run_tool(OrganizationUpdateTool)
