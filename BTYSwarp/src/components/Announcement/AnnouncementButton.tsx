import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Bell } from 'react-feather'
import { useTranslation } from 'react-i18next'
import { Announcement } from '../../hooks/useAnnouncements'
import AnnouncementModal from './AnnouncementModal'

const AnnouncementButtonContainer = styled.div`
  position: relative;
  display: inline-block;
`

const Button = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.borderColor};
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.2s;
  position: relative;
  
  &:hover {
    background: ${({ theme }) => theme.colors.tertiary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`

const Badge = styled.div`
  position: absolute;
  top: -4px;
  right: -4px;
  background: ${({ theme }) => theme.colors.failure};
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  border: 2px solid ${({ theme }) => theme.colors.background};
`

interface AnnouncementButtonProps {
  announcements?: Announcement[]
}

const AnnouncementButton: React.FC<AnnouncementButtonProps> = ({ announcements = [] }) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // 从 localStorage 读取已读公告 ID
  useEffect(() => {
    const readAnnouncements = JSON.parse(localStorage.getItem('readAnnouncements') || '[]')
    const unread = announcements.filter(ann => !readAnnouncements.includes(ann.id))
    setUnreadCount(unread.length)
  }, [announcements])

  const handleClick = () => {
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    // 标记所有公告为已读
    const allIds = announcements.map(ann => ann.id)
    localStorage.setItem('readAnnouncements', JSON.stringify(allIds))
    setUnreadCount(0)
  }

  return (
    <AnnouncementButtonContainer>
      <Button onClick={handleClick} title={t('announcements') || '公告'}>
        <Bell />
        {unreadCount > 0 && <Badge>{unreadCount > 9 ? '9+' : unreadCount}</Badge>}
      </Button>
      <AnnouncementModal
        isOpen={isOpen}
        onDismiss={handleClose}
        announcements={announcements}
      />
    </AnnouncementButtonContainer>
  )
}

export default AnnouncementButton

