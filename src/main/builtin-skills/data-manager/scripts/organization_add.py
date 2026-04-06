# -*- coding: utf-8 -*-
"""
组织架构图添加工具
支持创建图、添加节点
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file, save_json5_file
from utils.file_utils import get_organizations_dir, get_organization_path, get_data_dir


# 默认节点颜色
NODE_COLORS = [
    '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
    '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911'
]


class OrganizationAddTool(BaseTool):
    """组织架构图添加工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'create_graph')
        
        if action == 'create_graph':
            return self._create_graph()
        elif action == 'add_node':
            return self._add_node()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _create_graph(self) -> ToolResult:
        """创建新组织架构图"""
        name = self.get_required_param('name')
        description = self.get_param('description', '')
        linked_types = self.get_param('linkedVocabularyTypes', [])
        node_style = self.get_param('nodeStyle', 'simple')
        create_root = self.get_param('createRootNode', True)
        root_name = self.get_param('rootNodeName')
        
        org_dir = get_organizations_dir(self.project_path)
        data_dir = get_data_dir(self.project_path)
        
        # 确保目录存在
        if not os.path.exists(data_dir):
            os.makedirs(data_dir, exist_ok=True)
        if not os.path.exists(org_dir):
            os.makedirs(org_dir, exist_ok=True)
        
        now = self.get_timestamp()
        graph_id = self.generate_id()
        
        graph = {
            'id': graph_id,
            'name': name.strip(),
            'description': description,
            'thumbnail': None,
            'linkedVocabularyTypes': linked_types,
            'nodeStyle': node_style,
            'nodes': [],
            'nodeCount': 0,
            'createdAt': now,
            'updatedAt': now
        }
        
        # 创建根节点
        if create_root:
            root_node = {
                'id': self.generate_id(),
                'name': root_name or name.strip(),
                'parentId': None,
                'description': '',
                'color': NODE_COLORS[0],
                'order': 0,
                'collapsed': False,
                'createdAt': now,
                'updatedAt': now
            }
            graph['nodes'].append(root_node)
            graph['nodeCount'] = 1
        
        graph_path = get_organization_path(self.project_path, graph_id)
        save_json5_file(graph_path, graph)
        
        return ToolResult(
            success=True,
            data={'graph': graph},
            message=f'成功创建组织架构图: {name}'
        )
    
    def _add_node(self) -> ToolResult:
        """添加节点"""
        graph_id = self.get_required_param('graphId')
        name = self.get_required_param('name')
        parent_id = self.get_param('parentId')  # None 表示作为根节点
        
        # 可选参数
        description = self.get_param('description', '')
        color = self.get_param('color')
        linked_type_id = self.get_param('linkedTypeId')
        linked_entry_id = self.get_param('linkedEntryId')
        
        graph_path = get_organization_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='组织架构图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            nodes = graph.get('nodes', [])
            
            # 验证父节点存在
            if parent_id is not None:
                parent_exists = any(n.get('id') == parent_id for n in nodes)
                if not parent_exists:
                    return ToolResult(success=False, error=f'父节点不存在: {parent_id}')
            
            # 计算排序值
            siblings = [n for n in nodes if n.get('parentId') == parent_id]
            max_order = max((n.get('order', -1) for n in siblings), default=-1)
            
            now = self.get_timestamp()
            
            # 选择颜色
            if not color:
                color = NODE_COLORS[len(nodes) % len(NODE_COLORS)]
            
            new_node = {
                'id': self.generate_id(),
                'name': name.strip(),
                'parentId': parent_id,
                'description': description,
                'color': color,
                'order': max_order + 1,
                'collapsed': False,
                'createdAt': now,
                'updatedAt': now
            }
            
            if linked_type_id:
                new_node['linkedTypeId'] = linked_type_id
            if linked_entry_id:
                new_node['linkedEntryId'] = linked_entry_id
            
            nodes.append(new_node)
            graph['nodes'] = nodes
            graph['nodeCount'] = len(nodes)
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            return ToolResult(
                success=True,
                data={'node': new_node},
                message=f'成功添加节点: {name}'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'添加节点失败: {e}')


if __name__ == '__main__':
    run_tool(OrganizationAddTool)
