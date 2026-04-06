# -*- coding: utf-8 -*-
"""
关系图添加工具
支持创建图、添加节点、添加边
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file, save_json5_file
from utils.file_utils import get_relationships_dir, get_relationship_path, get_data_dir


# 内置关系类型
BUILTIN_RELATION_TYPES = [
    {'id': 'family', 'name': '亲情', 'color': '#52c41a', 'lineStyle': 'solid', 'lineWidth': 2, 'isBuiltIn': True},
    {'id': 'friendship', 'name': '友情', 'color': '#1890ff', 'lineStyle': 'solid', 'lineWidth': 2, 'isBuiltIn': True},
    {'id': 'love', 'name': '爱情', 'color': '#eb2f96', 'lineStyle': 'solid', 'lineWidth': 2, 'isBuiltIn': True},
    {'id': 'enemy', 'name': '敌对', 'color': '#f5222d', 'lineStyle': 'solid', 'lineWidth': 2, 'isBuiltIn': True},
    {'id': 'master', 'name': '师徒', 'color': '#722ed1', 'lineStyle': 'solid', 'lineWidth': 2, 'isBuiltIn': True},
    {'id': 'superior', 'name': '上下级', 'color': '#fa8c16', 'lineStyle': 'solid', 'lineWidth': 2, 'isBuiltIn': True},
    {'id': 'ally', 'name': '同盟', 'color': '#13c2c2', 'lineStyle': 'solid', 'lineWidth': 2, 'isBuiltIn': True},
    {'id': 'rival', 'name': '对手', 'color': '#faad14', 'lineStyle': 'dashed', 'lineWidth': 2, 'isBuiltIn': True},
    {'id': 'colleague', 'name': '同事', 'color': '#2f54eb', 'lineStyle': 'solid', 'lineWidth': 1, 'isBuiltIn': True},
    {'id': 'neighbor', 'name': '邻居', 'color': '#a0d911', 'lineStyle': 'solid', 'lineWidth': 1, 'isBuiltIn': True},
]


class RelationshipAddTool(BaseTool):
    """关系图添加工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'create_graph')
        
        if action == 'create_graph':
            return self._create_graph()
        elif action == 'add_node':
            return self._add_node()
        elif action == 'add_edge':
            return self._add_edge()
        elif action == 'add_relation_type':
            return self._add_relation_type()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _create_graph(self) -> ToolResult:
        """创建新关系图"""
        name = self.get_required_param('name')
        description = self.get_param('description', '')
        linked_types = self.get_param('linkedVocabularyTypes', [])
        node_style = self.get_param('nodeStyle', 'circle')
        
        rel_dir = get_relationships_dir(self.project_path)
        data_dir = get_data_dir(self.project_path)
        
        # 确保目录存在
        if not os.path.exists(data_dir):
            os.makedirs(data_dir, exist_ok=True)
        if not os.path.exists(rel_dir):
            os.makedirs(rel_dir, exist_ok=True)
        
        now = self.get_timestamp()
        graph_id = self.generate_id()
        
        graph = {
            'id': graph_id,
            'name': name.strip(),
            'description': description,
            'thumbnail': None,
            'linkedVocabularyTypes': linked_types,
            'customRelationTypes': [],
            'nodeStyle': node_style,
            'nodes': [],
            'edges': [],
            'nodeCount': 0,
            'edgeCount': 0,
            'createdAt': now,
            'updatedAt': now
        }
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        save_json5_file(graph_path, graph)
        
        return ToolResult(
            success=True,
            data={'graph': graph},
            message=f'成功创建关系图: {name}'
        )
    
    def _add_node(self) -> ToolResult:
        """添加节点"""
        graph_id = self.get_required_param('graphId')
        name = self.get_required_param('name')
        
        # 可选参数
        gender = self.get_param('gender', 'unknown')
        description = self.get_param('description', '')
        color = self.get_param('color', '#1890ff')
        avatar = self.get_param('avatar')
        linked_type_id = self.get_param('linkedTypeId')
        linked_entry_id = self.get_param('linkedEntryId')
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='关系图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            
            now = self.get_timestamp()
            new_node = {
                'id': self.generate_id(),
                'name': name.strip(),
                'gender': gender,
                'description': description,
                'color': color,
                'createdAt': now,
                'updatedAt': now
            }
            
            if avatar:
                new_node['avatar'] = avatar
            if linked_type_id:
                new_node['linkedTypeId'] = linked_type_id
            if linked_entry_id:
                new_node['linkedEntryId'] = linked_entry_id
            
            graph['nodes'].append(new_node)
            graph['nodeCount'] = len(graph['nodes'])
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            return ToolResult(
                success=True,
                data={'node': new_node},
                message=f'成功添加节点: {name}'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'添加节点失败: {e}')
    
    def _add_edge(self) -> ToolResult:
        """添加边（关系）"""
        graph_id = self.get_required_param('graphId')
        source = self.get_required_param('source')  # 源节点 ID
        target = self.get_required_param('target')  # 目标节点 ID
        relation_type_id = self.get_required_param('relationTypeId')
        label = self.get_param('label', '')  # 自定义关系描述
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='关系图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            
            # 验证节点存在
            nodes = graph.get('nodes', [])
            source_exists = any(n.get('id') == source for n in nodes)
            target_exists = any(n.get('id') == target for n in nodes)
            
            if not source_exists:
                return ToolResult(success=False, error=f'源节点不存在: {source}')
            if not target_exists:
                return ToolResult(success=False, error=f'目标节点不存在: {target}')
            
            now = self.get_timestamp()
            new_edge = {
                'id': self.generate_id(),
                'source': source,
                'target': target,
                'relationTypeId': relation_type_id,
                'label': label,
                'createdAt': now,
                'updatedAt': now
            }
            
            graph['edges'].append(new_edge)
            graph['edgeCount'] = len(graph['edges'])
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            return ToolResult(
                success=True,
                data={'edge': new_edge},
                message='成功添加关系'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'添加关系失败: {e}')
    
    def _add_relation_type(self) -> ToolResult:
        """添加自定义关系类型"""
        graph_id = self.get_required_param('graphId')
        name = self.get_required_param('name')
        color = self.get_param('color', '#1890ff')
        line_style = self.get_param('lineStyle', 'solid')
        line_width = self.get_param('lineWidth', 2)
        
        graph_path = get_relationship_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='关系图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            
            # 检查是否与内置类型冲突
            if any(t.get('name') == name for t in BUILTIN_RELATION_TYPES):
                return ToolResult(success=False, error=f'关系类型名称已存在: {name}')
            
            # 检查是否与自定义类型冲突
            custom_types = graph.get('customRelationTypes', [])
            if any(t.get('name') == name for t in custom_types):
                return ToolResult(success=False, error=f'关系类型名称已存在: {name}')
            
            now = self.get_timestamp()
            new_type = {
                'id': self.generate_id(),
                'name': name,
                'color': color,
                'lineStyle': line_style,
                'lineWidth': line_width,
                'isBuiltIn': False,
                'order': len(BUILTIN_RELATION_TYPES) + len(custom_types)
            }
            
            custom_types.append(new_type)
            graph['customRelationTypes'] = custom_types
            graph['updatedAt'] = now
            
            save_json5_file(graph_path, graph)
            
            return ToolResult(
                success=True,
                data={'relationType': new_type},
                message=f'成功添加关系类型: {name}'
            )
        except Exception as e:
            return ToolResult(success=False, error=f'添加关系类型失败: {e}')


if __name__ == '__main__':
    run_tool(RelationshipAddTool)
