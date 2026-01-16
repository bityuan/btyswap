import React, { useRef, useEffect, useState } from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import InviteRegistrationModal from '../InviteRegistrationModal'
import MyInvitesModal from '../MyInvitesModal'

const DropdownContainer = styled.div<{ show: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: ${({ theme }) => theme.colors.invertedContrast};
  border: 1px solid ${({ theme }) => theme.colors.tertiary};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: ${({ show }) => (show ? 'block' : 'none')};
  overflow: hidden;
`

const MenuItem = styled.div`
  padding: 12px 16px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.tertiary};
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.tertiary};
  }
`

const MenuSeparator = styled.div`
  height: 1px;
  background-color: ${({ theme }) => theme.colors.tertiary};
  margin: 4px 0;
`

interface UserMenuProps {
  show: boolean
  onClose: () => void
  onLogout: () => void
  buttonRef?: React.RefObject<HTMLDivElement>
}

export default function UserMenu({ show, onClose, onLogout, buttonRef }: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showMyInvitesModal, setShowMyInvitesModal] = useState(false)


  // 注意：我们不应该在菜单关闭时自动关闭邀请弹窗
  // 因为用户可能想要在菜单关闭后查看邀请弹窗
  // 这个 useEffect 已经被移除，因为会导致邀请弹窗立即关闭

  // 点击外部区域关闭菜单
  useEffect(() => {
    if (!show) {
      return undefined
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const isClickInsideMenu = menuRef.current?.contains(target)
      const isClickOnButton = buttonRef?.current?.contains(target)
      
      // 只有当点击既不在菜单内也不在按钮上时，才关闭菜单
      if (!isClickInsideMenu && !isClickOnButton) {
        onClose()
      }
    }

    // 使用延迟，确保按钮的点击事件先处理
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [show, onClose, buttonRef])

  const handleInvite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 先打开邀请弹窗，再关闭菜单
    setShowInviteModal(true)
    // 延迟关闭菜单，确保邀请弹窗先打开
    setTimeout(() => {
      onClose()
    }, 100)
  }

  const handleMyInvites = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClose()
    // 先打开我的邀请弹窗，再关闭菜单
    setShowMyInvitesModal(true)
    // 延迟关闭菜单，确保弹窗先打开
    setTimeout(() => {
      onClose()
    }, 100)
  }

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClose()
    onLogout()
  }

  const handleDismissInviteModal = () => {
    setShowInviteModal(false)
  }

  const handleDismissMyInvitesModal = () => {
    setShowMyInvitesModal(false)
  }

  if (!show) {
    return (
      <>
        <InviteRegistrationModal
          isOpen={showInviteModal}
          onDismiss={handleDismissInviteModal}
        />
        <MyInvitesModal
          isOpen={showMyInvitesModal}
          onDismiss={handleDismissMyInvitesModal}
        />
      </>
    )
  }

  return (
    <>
      <DropdownContainer ref={menuRef} show={show}>
        <MenuItem onClick={handleInvite}>
          {t('inviteRegistration')}
        </MenuItem>
        <MenuItem onClick={handleMyInvites}>
          {t('myInvites')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={handleLogout}>
          {t('logout')}
        </MenuItem>
      </DropdownContainer>
      <InviteRegistrationModal
        isOpen={showInviteModal}
        onDismiss={handleDismissInviteModal}
      />
      <MyInvitesModal
        isOpen={showMyInvitesModal}
        onDismiss={handleDismissMyInvitesModal}
      />
    </>
  )
}

