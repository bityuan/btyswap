import { useState, useEffect } from 'react'
import { apiGet } from '../utils/api'

export interface Announcement {
  id: string
  title: string
  content: string
  date: string
  type?: 'info' | 'warning' | 'success' | 'error'
}

/**
 * 获取公告列表
 * 优先从 API 获取，如果失败则使用默认公告
 */
export function useAnnouncements(): Announcement[] {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // 从 API 获取公告
        console.log('[Announcements] Fetching announcements from API...')
        const data = await apiGet<Announcement[]>('/swap/announcements')
        console.log('[Announcements] API response:', data)
        if (Array.isArray(data)) {
          setAnnouncements(data)
          console.log('[Announcements] Set announcements:', data.length)
          return
        } 
      } catch (error) {
        console.error('[Announcements] Failed to fetch announcements from API:', error)
      }

      // 如果 API 失败，使用默认公告（可以从配置文件读取）
      const defaultAnnouncements: Announcement[] = [
        // 示例公告，可以根据需要修改
        // {
        //   id: '1',
        //   title: '欢迎使用 BTY Swap',
        //   content: '欢迎使用 BTY Swap 去中心化交易平台！',
        //   date: new Date().toLocaleDateString('zh-CN'),
        //   type: 'info',
        // },
      ]
      setAnnouncements(defaultAnnouncements)
      console.log('[Announcements] Using default announcements:', defaultAnnouncements.length)
    }

    fetchAnnouncements()
  }, [])

  return announcements
}

