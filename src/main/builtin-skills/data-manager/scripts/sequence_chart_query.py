# -*- coding: utf-8 -*-
"""
事序图查询工具（只读）
支持查询事序图列表、详情、事件等
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file
from utils.file_utils import get_sequence_charts_dir, get_sequence_chart_path


class SequenceChartQueryTool(BaseTool):
    """事序图查询工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'list_charts')
        
        if action == 'list_charts':
            return self._list_charts()
        elif action == 'get_chart':
            return self._get_chart()
        elif action == 'get_event':
            return self._get_event()
        elif action == 'search_events':
            return self._search_events()
        elif action == 'get_character_events':
            return self._get_character_events()
        elif action == 'get_location_events':
            return self._get_location_events()
        elif action == 'get_event_types':
            return self._get_event_types()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _list_charts(self) -> ToolResult:
        """列出所有事序图"""
        charts_dir = get_sequence_charts_dir(self.project_path)
        
        if not os.path.exists(charts_dir):
            return ToolResult(success=True, data={'charts': [], 'total': 0})
        
        try:
            charts = []
            for filename in os.listdir(charts_dir):
                if filename.endswith('.json5'):
                    chart_path = os.path.join(charts_dir, filename)
                    chart = load_json5_file(chart_path)
                    
                    charts.append({
                        'id': chart.get('id'),
                        'name': chart.get('name'),
                        'description': chart.get('description'),
                        'eventCount': len(chart.get('events', [])),
                        'axisConfig': chart.get('axisConfig', {}),
                        'tags': chart.get('tags', []),
                        'createdAt': chart.get('createdAt'),
                        'updatedAt': chart.get('updatedAt')
                    })
            
            charts.sort(key=lambda x: x.get('updatedAt', ''), reverse=True)
            
            return ToolResult(
                success=True,
                data={'charts': charts, 'total': len(charts)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'读取事序图列表失败: {e}')
    
    def _get_chart(self) -> ToolResult:
        """获取单个事序图详情"""
        chart_id = self.get_required_param('chartId')
        include_events = self.get_param('includeEvents', True)
        
        chart_path = get_sequence_chart_path(self.project_path, chart_id)
        if not os.path.exists(chart_path):
            return ToolResult(success=False, error=f'事序图不存在: {chart_id}')
        
        try:
            chart = load_json5_file(chart_path)
            
            result = {
                'id': chart.get('id'),
                'name': chart.get('name'),
                'description': chart.get('description'),
                'axisConfig': chart.get('axisConfig', {}),
                'customEventTypes': chart.get('customEventTypes', []),
                'eventCount': len(chart.get('events', [])),
                'tags': chart.get('tags', []),
                'createdAt': chart.get('createdAt'),
                'updatedAt': chart.get('updatedAt')
            }
            
            if include_events:
                # 按时间排序事件
                events = sorted(
                    chart.get('events', []),
                    key=lambda x: x.get('timeInfo', {}).get('cellStart', 0)
                )
                result['events'] = events
            
            return ToolResult(success=True, data={'chart': result})
        except Exception as e:
            return ToolResult(success=False, error=f'读取事序图失败: {e}')
    
    def _get_event(self) -> ToolResult:
        """获取单个事件"""
        chart_id = self.get_required_param('chartId')
        event_id = self.get_required_param('eventId')
        
        chart_path = get_sequence_chart_path(self.project_path, chart_id)
        if not os.path.exists(chart_path):
            return ToolResult(success=False, error='事序图不存在')
        
        try:
            chart = load_json5_file(chart_path)
            events = chart.get('events', [])
            event = next((e for e in events if e.get('id') == event_id), None)
            
            if event:
                return ToolResult(success=True, data={'event': event})
            else:
                return ToolResult(success=False, error=f'事件不存在: {event_id}')
        except Exception as e:
            return ToolResult(success=False, error=f'查询事件失败: {e}')
    
    def _search_events(self) -> ToolResult:
        """搜索事件"""
        keyword = self.get_param('keyword', '').lower()
        chart_id = self.get_param('chartId')  # 可选，限制搜索范围
        
        if not keyword:
            return ToolResult(success=False, error='请提供搜索关键词')
        
        charts_dir = get_sequence_charts_dir(self.project_path)
        if not os.path.exists(charts_dir):
            return ToolResult(success=True, data={'events': [], 'total': 0})
        
        try:
            matched_events = []
            
            if chart_id:
                chart_files = [f'{chart_id}.json5']
            else:
                chart_files = [f for f in os.listdir(charts_dir) if f.endswith('.json5')]
            
            for filename in chart_files:
                chart_path = os.path.join(charts_dir, filename)
                chart = load_json5_file(chart_path)
                
                for event in chart.get('events', []):
                    # 在标题和描述中搜索
                    if (keyword in event.get('title', '').lower() or
                        keyword in (event.get('description') or '').lower()):
                        event['_chartId'] = chart.get('id')
                        event['_chartName'] = chart.get('name')
                        matched_events.append(event)
            
            return ToolResult(
                success=True,
                data={'events': matched_events, 'total': len(matched_events)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'搜索失败: {e}')
    
    def _get_character_events(self) -> ToolResult:
        """获取角色参与的所有事件"""
        character_id = self.get_required_param('characterId')
        
        charts_dir = get_sequence_charts_dir(self.project_path)
        if not os.path.exists(charts_dir):
            return ToolResult(success=True, data={'events': [], 'total': 0})
        
        try:
            events = []
            
            for filename in os.listdir(charts_dir):
                if not filename.endswith('.json5'):
                    continue
                    
                chart_path = os.path.join(charts_dir, filename)
                chart = load_json5_file(chart_path)
                
                for event in chart.get('events', []):
                    characters = event.get('characters', [])
                    if any(c.get('id') == character_id for c in characters):
                        events.append({
                            'chartId': chart.get('id'),
                            'chartName': chart.get('name'),
                            'event': event
                        })
            
            # 按时间排序
            events.sort(key=lambda e: e.get('event', {}).get('timeInfo', {}).get('cellStart', 0))
            
            return ToolResult(
                success=True,
                data={'events': events, 'total': len(events)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'查询角色事件失败: {e}')
    
    def _get_location_events(self) -> ToolResult:
        """获取在特定地点发生的所有事件"""
        location_name = self.get_required_param('locationName').lower()
        
        charts_dir = get_sequence_charts_dir(self.project_path)
        if not os.path.exists(charts_dir):
            return ToolResult(success=True, data={'events': [], 'total': 0})
        
        try:
            events = []
            
            for filename in os.listdir(charts_dir):
                if not filename.endswith('.json5'):
                    continue
                    
                chart_path = os.path.join(charts_dir, filename)
                chart = load_json5_file(chart_path)
                
                for event in chart.get('events', []):
                    location = event.get('location', {})
                    if location and location_name in (location.get('name') or '').lower():
                        events.append({
                            'chartId': chart.get('id'),
                            'chartName': chart.get('name'),
                            'event': event
                        })
            
            # 按时间排序
            events.sort(key=lambda e: e.get('event', {}).get('timeInfo', {}).get('cellStart', 0))
            
            return ToolResult(
                success=True,
                data={'events': events, 'total': len(events)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'查询地点事件失败: {e}')
    
    def _get_event_types(self) -> ToolResult:
        """获取事序图的事件类型列表"""
        chart_id = self.get_required_param('chartId')
        
        chart_path = get_sequence_chart_path(self.project_path, chart_id)
        if not os.path.exists(chart_path):
            return ToolResult(success=False, error='事序图不存在')
        
        try:
            chart = load_json5_file(chart_path)
            
            # 内置事件类型
            builtin_types = [
                {'id': 'daily', 'name': '日常', 'color': '#1890ff', 'isBuiltIn': True},
                {'id': 'romance', 'name': '恋爱', 'color': '#eb2f96', 'isBuiltIn': True},
                {'id': 'conflict', 'name': '冲突', 'color': '#f5222d', 'isBuiltIn': True},
                {'id': 'battle', 'name': '战斗', 'color': '#fa8c16', 'isBuiltIn': True},
                {'id': 'mystery', 'name': '悬疑', 'color': '#722ed1', 'isBuiltIn': True},
                {'id': 'comedy', 'name': '喜剧', 'color': '#52c41a', 'isBuiltIn': True},
                {'id': 'tragedy', 'name': '悲剧', 'color': '#8c8c8c', 'isBuiltIn': True},
                {'id': 'other', 'name': '其他', 'color': '#bfbfbf', 'isBuiltIn': True},
            ]
            
            custom_types = chart.get('customEventTypes', [])
            
            all_types = builtin_types + custom_types
            
            return ToolResult(
                success=True,
                data={'eventTypes': all_types, 'total': len(all_types)}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'获取事件类型失败: {e}')


if __name__ == '__main__':
    run_tool(SequenceChartQueryTool)
