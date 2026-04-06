# -*- coding: utf-8 -*-
"""
时间线查询工具（只读）
支持查询时间线列表、详情、节点、分支等
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file
from utils.file_utils import get_timelines_dir, get_timeline_path


class TimelineQueryTool(BaseTool):
    """时间线查询工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'list_timelines')
        
        if action == 'list_timelines':
            return self._list_timelines()
        elif action == 'get_timeline':
            return self._get_timeline()
        elif action == 'get_node':
            return self._get_node()
        elif action == 'get_branches':
            return self._get_branches()
        elif action == 'search_nodes':
            return self._search_nodes()
        elif action == 'get_character_events':
            return self._get_character_events()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _list_timelines(self) -> ToolResult:
        """列出所有时间线"""
        tl_dir = get_timelines_dir(self.project_path)
        
        if not os.path.exists(tl_dir):
            return ToolResult(success=True, data={'timelines': [], 'total': 0})
        
        try:
            timelines = []
            for filename in os.listdir(tl_dir):
                if filename.endswith('.json5'):
                    tl_path = os.path.join(tl_dir, filename)
                    tl = load_json5_file(tl_path)
                    
                    timelines.append({
                        'id': tl.get('id'),
                        'name': tl.get('name'),
                        'description': tl.get('description'),
                        'branchInfo': tl.get('branchInfo', {'type': 'main'}),
                        'nodeCount': len(tl.get('nodes', [])),
                        'tags': tl.get('tags', []),
                        'createdAt': tl.get('createdAt'),
                        'updatedAt': tl.get('updatedAt')
                    })
            
            timelines.sort(key=lambda x: x.get('updatedAt', ''), reverse=True)
            
            return ToolResult(
                success=True,
                data={'timelines': timelines, 'total': len(timelines)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'读取时间线列表失败: {e}')
    
    def _get_timeline(self) -> ToolResult:
        """获取单个时间线详情"""
        timeline_id = self.get_required_param('timelineId')
        include_nodes = self.get_param('includeNodes', True)
        
        tl_path = get_timeline_path(self.project_path, timeline_id)
        if not os.path.exists(tl_path):
            return ToolResult(success=False, error=f'时间线不存在: {timeline_id}')
        
        try:
            tl = load_json5_file(tl_path)
            
            result = {
                'id': tl.get('id'),
                'name': tl.get('name'),
                'description': tl.get('description'),
                'branchInfo': tl.get('branchInfo', {'type': 'main'}),
                'nodeCount': len(tl.get('nodes', [])),
                'tags': tl.get('tags', []),
                'createdAt': tl.get('createdAt'),
                'updatedAt': tl.get('updatedAt')
            }
            
            if include_nodes:
                # 按 order 排序节点
                nodes = sorted(tl.get('nodes', []), key=lambda x: x.get('order', 0))
                result['nodes'] = nodes
            
            return ToolResult(success=True, data={'timeline': result})
        except Exception as e:
            return ToolResult(success=False, error=f'读取时间线失败: {e}')
    
    def _get_node(self) -> ToolResult:
        """获取单个节点"""
        timeline_id = self.get_required_param('timelineId')
        node_id = self.get_required_param('nodeId')
        
        tl_path = get_timeline_path(self.project_path, timeline_id)
        if not os.path.exists(tl_path):
            return ToolResult(success=False, error='时间线不存在')
        
        try:
            tl = load_json5_file(tl_path)
            nodes = tl.get('nodes', [])
            node = next((n for n in nodes if n.get('id') == node_id), None)
            
            if node:
                # 获取相邻节点
                sorted_nodes = sorted(nodes, key=lambda x: x.get('order', 0))
                node_order = node.get('order', 0)
                
                prev_node = next((n for n in sorted_nodes if n.get('order', -1) < node_order), None)
                next_node = next((n for n in sorted_nodes if n.get('order', float('inf')) > node_order), None)
                
                return ToolResult(
                    success=True,
                    data={
                        'node': node,
                        'prevNode': prev_node,
                        'nextNode': next_node
                    }
                )
            else:
                return ToolResult(success=False, error=f'节点不存在: {node_id}')
        except Exception as e:
            return ToolResult(success=False, error=f'查询节点失败: {e}')
    
    def _get_branches(self) -> ToolResult:
        """获取时间线的所有分支"""
        timeline_id = self.get_required_param('timelineId')
        
        tl_dir = get_timelines_dir(self.project_path)
        if not os.path.exists(tl_dir):
            return ToolResult(success=True, data={'branches': [], 'total': 0})
        
        try:
            branches = []
            for filename in os.listdir(tl_dir):
                if filename.endswith('.json5'):
                    tl_path = os.path.join(tl_dir, filename)
                    tl = load_json5_file(tl_path)
                    
                    branch_info = tl.get('branchInfo', {})
                    if branch_info.get('parentTimelineId') == timeline_id:
                        branches.append({
                            'id': tl.get('id'),
                            'name': tl.get('name'),
                            'branchInfo': branch_info,
                            'nodeCount': len(tl.get('nodes', []))
                        })
            
            return ToolResult(
                success=True,
                data={'branches': branches, 'total': len(branches)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'查询分支失败: {e}')
    
    def _search_nodes(self) -> ToolResult:
        """搜索时间线节点"""
        keyword = self.get_param('keyword', '').lower()
        timeline_id = self.get_param('timelineId')  # 可选，限制搜索范围
        
        if not keyword:
            return ToolResult(success=False, error='请提供搜索关键词')
        
        tl_dir = get_timelines_dir(self.project_path)
        if not os.path.exists(tl_dir):
            return ToolResult(success=True, data={'nodes': [], 'total': 0})
        
        try:
            matched_nodes = []
            
            if timeline_id:
                tl_files = [f'{timeline_id}.json5']
            else:
                tl_files = [f for f in os.listdir(tl_dir) if f.endswith('.json5')]
            
            for filename in tl_files:
                tl_path = os.path.join(tl_dir, filename)
                tl = load_json5_file(tl_path)
                
                for node in tl.get('nodes', []):
                    # 在标题和描述中搜索
                    if (keyword in node.get('title', '').lower() or
                        keyword in node.get('description', '').lower()):
                        node['_timelineId'] = tl.get('id')
                        node['_timelineName'] = tl.get('name')
                        matched_nodes.append(node)
            
            return ToolResult(
                success=True,
                data={'nodes': matched_nodes, 'total': len(matched_nodes)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'搜索失败: {e}')
    
    def _get_character_events(self) -> ToolResult:
        """获取角色参与的所有事件"""
        character_id = self.get_required_param('characterId')
        
        tl_dir = get_timelines_dir(self.project_path)
        if not os.path.exists(tl_dir):
            return ToolResult(success=True, data={'events': [], 'total': 0})
        
        try:
            events = []
            
            for filename in os.listdir(tl_dir):
                if not filename.endswith('.json5'):
                    continue
                    
                tl_path = os.path.join(tl_dir, filename)
                tl = load_json5_file(tl_path)
                
                for node in tl.get('nodes', []):
                    characters = node.get('characters', [])
                    if any(c.get('id') == character_id for c in characters):
                        events.append({
                            'timelineId': tl.get('id'),
                            'timelineName': tl.get('name'),
                            'node': node
                        })
            
            # 按时间排序（如果有时）
            def sort_key(e):
                node = e.get('node', {})
                time_info = node.get('timeInfo', {})
                if time_info.get('format') == 'datetime' and time_info.get('datetime'):
                    return time_info.get('datetime')
                return node.get('order', 0)
            
            events.sort(key=sort_key)
            
            return ToolResult(
                success=True,
                data={'events': events, 'total': len(events)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'查询角色事件失败: {e}')


if __name__ == '__main__':
    run_tool(TimelineQueryTool)
