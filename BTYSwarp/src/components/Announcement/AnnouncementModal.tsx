import React from 'react'
import styled from 'styled-components'
import { Text, CloseIcon } from '@pancakeswap-libs/uikit'
import { useTranslation } from 'react-i18next'
import { Announcement } from '../../hooks/useAnnouncements'
import Modal from '../Modal'

const ModalContainer = styled.div`
  padding: 24px;
  max-height: 80vh;
  overflow-y: auto;
`

const AnnouncementList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const AnnouncementItem = styled.div<{ type?: string }>`
  padding: 16px;
  border-radius: 8px;
  background: ${({ theme, type }) => {
    if (type === 'warning') return theme.colors.warning
    if (type === 'error') return theme.colors.failure
    if (type === 'success') return theme.colors.success
    return theme.colors.input
  }};
  border-left: 4px solid ${({ theme, type }) => {
    if (type === 'warning') return theme.colors.warning
    if (type === 'error') return theme.colors.failure
    if (type === 'success') return theme.colors.success
    return theme.colors.primary
  }};
`

const AnnouncementTitle = styled(Text)`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.text};
`

const AnnouncementContent = styled(Text)`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSubtle};
  line-height: 1.6;
  white-space: pre-wrap;
`

const AnnouncementDate = styled(Text)`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSubtle};
  margin-top: 8px;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.textSubtle};
`

interface AnnouncementModalProps {
  isOpen: boolean
  onDismiss: () => void
  announcements: Announcement[]
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  isOpen,
  onDismiss,
  announcements,
}) => {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen} onDismiss={onDismiss} maxHeight={90} minHeight={50}>
      <ModalContainer>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Text fontSize="20px" fontWeight="bold">
            {t('announcements') || '公告'}
          </Text>
          <CloseIcon onClick={onDismiss} style={{ cursor: 'pointer' }} />
        </div>

        {announcements.length === 0 ? (
          <EmptyState>
            <Text>{t('noAnnouncements') || '暂无公告'}</Text>
          </EmptyState>
        ) : (
          <AnnouncementList>
            {announcements.map((announcement) => (
              <AnnouncementItem key={announcement.id} type={announcement.type}>
                <AnnouncementTitle>{announcement.title}</AnnouncementTitle>
                <AnnouncementContent>{announcement.content}</AnnouncementContent>
                <AnnouncementDate>{announcement.date}</AnnouncementDate>
              </AnnouncementItem>
            ))}
          </AnnouncementList>
        )}
      </ModalContainer>
    </Modal>
  )
}

export default AnnouncementModal

