/**
 * 地图服务
 * 负责地图的 CRUD 操作和缩略图生成
 *
 * 新版：支持板块(Chunk)、内部元素(MapElement)、连接(Connection)
 */

import JSON5 from 'json5'
import {
  Map,
  MapMeta,
  CreateMapOptions,
  UpdateMapOptions,
  createDefaultMapData
} from '../types/map'
import { BaseService } from './base'

/**
 * 地图服务
 * 继承 BaseService 实现通用 CRUD 操作
 */
class MapService extends BaseService<Map, MapMeta> {
  constructor() {
    super({ dataSubDir: 'maps' })
  }

  // ============================================
  // BaseService 抽象方法实现
  // ============================================

  protected parseEntity(content: string): Map | null {
    try {
      return JSON5.parse(content) as Map
    } catch (error) {
      this.logger.error('解析地图失败', error)
      return null
    }
  }

  protected serializeEntity(item: Map): string {
    return JSON5.stringify(item, null, 2)
  }

  protected toMetadata(item: Map): MapMeta {
    let thumbnailPath: string | undefined = undefined
    if (item.thumbnail) {
      const fullPath = this.getThumbnailFullPath(item.id)
      if (fullPath) {
        thumbnailPath = fullPath
      }
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      thumbnail: thumbnailPath,
      chunkCount: item.data?.chunks?.length || 0,
      connectionCount: item.data?.connections?.length || 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }
  }

  protected sortItems(items: MapMeta[]): MapMeta[] {
    return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  // ============================================
  // 地图管理
  // ============================================

  /**
   * 创建地图
   */
  createMap(options: CreateMapOptions): Map {
    const now = this.getTimestamp()
    const mapId = this.generateId()

    const mapData = createDefaultMapData()

    if (options.canvasWidth) mapData.canvasWidth = options.canvasWidth
    if (options.canvasHeight) mapData.canvasHeight = options.canvasHeight
    if (options.backgroundColor) mapData.backgroundColor = options.backgroundColor

    const map: Map = {
      id: mapId,
      name: options.name.trim(),
      description: options.description,
      thumbnail: undefined,
      chunkCount: 0,
      connectionCount: 0,
      data: mapData,
      createdAt: now,
      updatedAt: now
    }

    this.save(map)
    return map
  }

  /**
   * 更新地图
   */
  updateMap(mapId: string, updates: UpdateMapOptions): Map | null {
    const map = this.get(mapId)
    if (!map) return null

    const now = this.getTimestamp()

    const updatedMap: Map = {
      ...map,
      ...updates,
      id: map.id,
      createdAt: map.createdAt,
      updatedAt: now
    }

    if (updates.data) {
      updatedMap.chunkCount = updates.data.chunks?.length || 0
      updatedMap.connectionCount = updates.data.connections?.length || 0
    }

    this.save(updatedMap)
    return updatedMap
  }

  // ============================================
  // 缩略图（扩展基类方法）
  // ============================================

  /**
   * 保存缩略图（扩展基类方法以更新元数据）
   */
  override saveThumbnail(mapId: string, dataUrl: string): string | null {
    const result = super.saveThumbnail(mapId, dataUrl)
    if (result) {
      const map = this.get(mapId)
      if (map) {
        map.thumbnail = `${mapId}.png`
        this.save(map)
      }
    }
    return result
  }

  // ============================================
  // 导入导出
  // ============================================

  /**
   * 导入地图（覆盖基类方法）
   */
  override importItem(jsonContent: string): Map | null {
    try {
      const map = JSON5.parse(jsonContent) as Map

      const newId = this.generateId()
      const now = this.getTimestamp()

      const importedMap: Map = {
        ...map,
        id: newId,
        name: `${map.name} (导入)`,
        thumbnail: undefined,
        createdAt: now,
        updatedAt: now
      }

      this.save(importedMap)
      return importedMap
    } catch (error) {
      this.logger.error('导入地图失败', error)
      return null
    }
  }

  /**
   * 重新排序地图
   */
  reorderMaps(mapIds: string[]): boolean {
    try {
      mapIds.forEach(mapId => {
        const map = this.get(mapId)
        if (map) {
          map.updatedAt = this.getTimestamp()
          this.save(map)
        }
      })
      return true
    } catch (error) {
      this.logger.error('重排地图顺序失败', error)
      return false
    }
  }
}

export const mapService = new MapService()
