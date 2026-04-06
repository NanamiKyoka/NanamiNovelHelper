# -*- coding: utf-8 -*-
"""
组织架构图查询工具
支持查询图列表、图详情、节点、子树等
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file
from utils.file_utils import get_organizations_dir, get_organization_path


class OrganizationQueryTool(BaseTool):
    """组织架构图查询工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'list_graphs')
        
        if action == 'list_graphs':
            return self._list_graphs()
        elif action == 'get_graph':
            return self._get_graph()
        elif action == 'get_node':
            return self._get_node()
        elif action == 'get_children':
            return self._get_children()
        elif action == 'get_descendants':
            return self._get_descendants()
        elif action == 'get_ancestors':
            return self._get_ancestors()
        elif action == 'search_nodes':
            return self._search_nodes()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _list_graphs(self) -> ToolResult:
        """列出所有组织架构图"""
        org_dir = get_organizations_dir(self.project_path)
        
        if not os.path.exists(org_dir):
            return ToolResult(success=True, data={'graphs': [], 'total': 0})
        
        try:
            graphs = []
            for filename in os.listdir(org_dir):
                if filename.endswith('.json5'):
                    graph_path = os.path.join(org_dir, filename)
                    graph = load_json5_file(graph_path)
                    
                    graphs.append({
                        'id': graph.get('id'),
                        'name': graph.get('name'),
                        'description': graph.get('description'),
                        'nodeCount': len(graph.get('nodes', [])),
                        'nodeStyle': graph.get('nodeStyle', 'simple'),
                        'linkedVocabularyTypes': graph.get('linkedVocabularyTypes', []),
                        'createdAt': graph.get('createdAt'),
                        'updatedAt': graph.get('updatedAt')
                    })
            
            graphs.sort(key=lambda x: x.get('updatedAt', ''), reverse=True)
            
            return ToolResult(
                success=True,
                data={'graphs': graphs, 'total': len(graphs)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'读取组织架构图列表失败: {e}')
    
    def _get_graph(self) -> ToolResult:
        """获取单个组织架构图详情"""
        graph_id = self.get_required_param('graphId')
        as_tree = self.get_param('asTree', False)  # 是否返回树形结构
        
        graph_path = get_organization_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error=f'组织架构图不存在: {graph_id}')
        
        try:
            graph = load_json5_file(graph_path)
            
            result = {
                'id': graph.get('id'),
                'name': graph.get('name'),
                'description': graph.get('description'),
                'linkedVocabularyTypes': graph.get('linkedVocabularyTypes', []),
                'nodeStyle': graph.get('nodeStyle', 'simple'),
                'nodeCount': len(graph.get('nodes', [])),
                'viewState': graph.get('viewState'),
                'createdAt': graph.get('createdAt'),
                'updatedAt': graph.get('updatedAt')
            }
            
            if as_tree:
                result['tree'] = self._build_tree(graph.get('nodes', []))
            else:
                result['nodes'] = graph.get('nodes', [])
            
            return ToolResult(success=True, data={'graph': result})
        except Exception as e:
            return ToolResult(success=False, error=f'读取组织架构图失败: {e}')
    
    def _build_tree(self, nodes):
        """将扁平节点列表转换为树形结构"""
        node_map = {n.get('id'): {**n, 'children': []} for n in nodes}
        roots = []
        
        for node in node_map.values():
            parent_id = node.get('parentId')
            if parent_id and parent_id in node_map:
                node_map[parent_id]['children'].append(node)
            else:
                roots.append(node)
        
        # 按 order 排序
        def sort_children(node):
            node['children'].sort(key=lambda x: x.get('order', 0))
            for child in node['children']:
                sort_children(child)
        
        roots.sort(key=lambda x: x.get('order', 0))
        for root in roots:
            sort_children(root)
        
        return roots
    
    def _get_node(self) -> ToolResult:
        """获取单个节点"""
        graph_id = self.get_required_param('graphId')
        node_id = self.get_required_param('nodeId')
        
        graph_path = get_organization_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='组织架构图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            nodes = graph.get('nodes', [])
            node = next((n for n in nodes if n.get('id') == node_id), None)
            
            if node:
                # 获取父节点和直接子节点
                parent = None
                if node.get('parentId'):
                    parent = next((n for n in nodes if n.get('id') == node.get('parentId')), None)
                
                children = [
                    n for n in nodes 
                    if n.get('parentId') == node_id
                ]
                children.sort(key=lambda x: x.get('order', 0))
                
                return ToolResult(
                    success=True,
                    data={
                        'node': node,
                        'parent': parent,
                        'children': children
                    }
                )
            else:
                return ToolResult(success=False, error=f'节点不存在: {node_id}')
        except Exception as e:
            return ToolResult(success=False, error=f'查询节点失败: {e}')
    
    def _get_children(self) -> ToolResult:
        """获取直接子节点"""
        graph_id = self.get_required_param('graphId')
        parent_id = self.get_param('parentId')  # None 表示获取根节点
        
        graph_path = get_organization_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='组织架构图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            nodes = graph.get('nodes', [])
            
            children = [
                n for n in nodes 
                if n.get('parentId') == parent_id
            ]
            children.sort(key=lambda x: x.get('order', 0))
            
            return ToolResult(
                success=True,
                data={'children': children, 'total': len(children)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'查询子节点失败: {e}')
    
    def _get_descendants(self) -> ToolResult:
        """获取所有子孙节点"""
        graph_id = self.get_required_param('graphId')
        node_id = self.get_required_param('nodeId')
        
        graph_path = get_organization_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='组织架构图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            nodes = graph.get('nodes', [])
            
            # 递归获取子孙节点
            def get_descendants(parent_id):
                result = []
                children = [n for n in nodes if n.get('parentId') == parent_id]
                for child in children:
                    result.append(child)
                    result.extend(get_descendants(child.get('id')))
                return result
            
            descendants = get_descendants(node_id)
            
            return ToolResult(
                success=True,
                data={'descendants': descendants, 'total': len(descendants)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'查询子孙节点失败: {e}')
    
    def _get_ancestors(self) -> ToolResult:
        """获取所有祖先节点"""
        graph_id = self.get_required_param('graphId')
        node_id = self.get_required_param('nodeId')
        
        graph_path = get_organization_path(self.project_path, graph_id)
        if not os.path.exists(graph_path):
            return ToolResult(success=False, error='组织架构图不存在')
        
        try:
            graph = load_json5_file(graph_path)
            nodes = graph.get('nodes', [])
            
            # 查找节点
            node = next((n for n in nodes if n.get('id') == node_id), None)
            if not node:
                return ToolResult(success=False, error=f'节点不存在: {node_id}')
            
            # 向上遍历获取祖先
            ancestors = []
            current = node
            while current.get('parentId'):
                parent = next((n for n in nodes if n.get('id') == current.get('parentId')), None)
                if parent:
                    ancestors.append(parent)
                    current = parent
                else:
                    break
            
            return ToolResult(
                success=True,
                data={'ancestors': ancestors, 'total': len(ancestors)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'查询祖先节点失败: {e}')
    
    def _search_nodes(self) -> ToolResult:
        """搜索节点"""
        keyword = self.get_param('keyword', '').lower()
        graph_id = self.get_param('graphId')
        
        if not keyword:
            return ToolResult(success=False, error='请提供搜索关键词')
        
        org_dir = get_organizations_dir(self.project_path)
        if not os.path.exists(org_dir):
            return ToolResult(success=True, data={'nodes': [], 'total': 0})
        
        try:
            matched_nodes = []
            
            if graph_id:
                graph_files = [f'{graph_id}.json5']
            else:
                graph_files = [f for f in os.listdir(org_dir) if f.endswith('.json5')]
            
            for filename in graph_files:
                graph_path = os.path.join(org_dir, filename)
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


if __name__ == '__main__':
    run_tool(OrganizationQueryTool)
