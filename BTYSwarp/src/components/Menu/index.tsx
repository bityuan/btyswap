import React, { useState, useRef, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import styled from 'styled-components'
import { Button } from '@pancakeswap-libs/uikit'
import { useTranslation } from 'react-i18next'
import useDirectAuth from '../../hooks/useDirectAuth'
import useLanguage from '../../hooks/useLanguage'
import useTheme from '../../hooks/useTheme'
import InviteRegistrationModal from '../InviteRegistrationModal'
import MyInvitesModal from '../MyInvitesModal'
import { FAQModal } from '../FAQ'

const MenuContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
  width: 100%;
  max-width: 100vw;
`

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
  justify-content: flex-start;
  min-width: 0;
`

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
  flex-shrink: 1;
`

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
  
  img {
    width: 45px;
    height: 45px;
  }
`

const ConnectButton = styled(Button)`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
  white-space: nowrap;
  min-width: fit-content;
  flex-shrink: 1;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  border: none;
`

const AddressDisplay = styled.div`
  padding: 8px 16px;
  font-weight: 600;
  font-size: 16px;
  color: white;
  white-space: nowrap;
  background: ${({ theme }) => theme.colors.primary};
  border-radius: 8px;
  border: none;
  min-width: fit-content;
  flex-shrink: 1;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MenuButton = styled.button`
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
  
  &:hover {
    background: ${({ theme }) => theme.colors.tertiary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
`

const MenuDropdown = styled.div<{ show: boolean }>`
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
  display: flex;
  align-items: center;
  gap: 12px;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.tertiary};
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.tertiary};
  }
  
  img {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
`

const MenuItemText = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  
  p {
    margin: 0;
    line-height: 1.4;
    
    &:first-child {
      font-weight: 500;
      color: ${({ theme }) => theme.colors.text};
    }
    
    &:last-child {
      font-size: 12px;
      color: ${({ theme }) => theme.colors.textSubtle};
    }
  }
`

const MenuContainerWrapper = styled.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`

const Icon = styled.img<{ isDark?: boolean }>`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  opacity: 0.8;
  filter: ${({ isDark }) => 
    isDark 
      ? 'brightness(0) invert(1)' 
      : 'brightness(0)'
  };
  transition: opacity 0.2s;
  
  ${MenuItem}:hover & {
    opacity: 1;
  }
`

const MenuButtonIcon = styled.img<{ isDark?: boolean }>`
  width: 24px;
  height: 24px;
  opacity: 0.9;
  filter: ${({ isDark }) => 
    isDark 
      ? 'brightness(0) invert(1)' 
      : 'brightness(0)'
  };
  transition: opacity 0.2s;
  
  ${MenuButton}:hover & {
    opacity: 1;
  }
`

const Menu: React.FC = () => {
  const { account } = useWeb3React()
  const { handleLogin, handleLogout, isConnecting } = useDirectAuth()
  const { t } = useTranslation()
  const { currentLanguage, toggleLanguage } = useLanguage()
  const { isDark } = useTheme()
  const [showMenu, setShowMenu] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showMyInvitesModal, setShowMyInvitesModal] = useState(false)
  const [showFAQModal, setShowFAQModal] = useState(false)
  const menuButtonRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部区域关闭菜单
  useEffect(() => {
    if (!showMenu) {
      return undefined
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const isClickInsideMenu = menuRef.current?.contains(target)
      const isClickOnButton = menuButtonRef.current?.contains(target)
      
      if (!isClickInsideMenu && !isClickOnButton) {
        setShowMenu(false)
      }
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [showMenu])

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(!showMenu)
  }

  const handleInvite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowInviteModal(true)
    setShowMenu(false)
  }

  const handleMyInvites = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMyInvitesModal(true)
    setShowMenu(false)
  }

  const handleLanguage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleLanguage()
    setShowMenu(false)
  }

  const handleFAQ = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowFAQModal(true)
    setShowMenu(false)
  }

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMenu(false)
    handleLogout()
  }

  return (
    <>
      <MenuContainer>
        <LeftSection>
          <Logo>
            <img src="/images/logo.png" alt="BTY" />
          </Logo>
        </LeftSection>

        <RightSection>
          {account ? (
            <>
              <AddressDisplay>
                {account.slice(0, 6)}...{account.slice(-4)}
              </AddressDisplay>
              <MenuContainerWrapper ref={menuButtonRef}>
                <MenuButton onClick={handleMenuClick} title={t('menu') || 'Menu'}>
                  <MenuButtonIcon src="/images/menu-icon.svg" alt="Menu" isDark={isDark} />
                </MenuButton>
                <MenuDropdown ref={menuRef} show={showMenu}>
                  <MenuItem onClick={handleInvite}>
                    <Icon src="/images/invite-icon.svg" alt="Invite" isDark={isDark} />
                    <MenuItemText>
                      <p>{t('inviteRegistration')}</p>
                      <p>{currentLanguage === 'zh-CN' ? '获得推广收益' : 'Get referral rewards'}</p>
                    </MenuItemText>
                  </MenuItem>
                  <MenuItem onClick={handleMyInvites}>
                    <Icon src="/images/my-invites-icon.svg" alt="My Invites" isDark={isDark} />
                    <MenuItemText>
                      <p>{t('myInvites')}</p>
                      <p>{currentLanguage === 'zh-CN' ? '查看邀请记录' : 'View invite records'}</p>
                    </MenuItemText>
                  </MenuItem>
                  <MenuItem onClick={handleLanguage}>
                    <Icon src="/images/language-icon.svg" alt="Language" isDark={isDark} />
                    <MenuItemText>
                      <p>{currentLanguage === 'zh-CN' ? '语言' : 'Language'}</p>
                      <p>{currentLanguage === 'zh-CN' ? '中英切换' : 'Switch Language'}</p>
                    </MenuItemText>
                  </MenuItem>
                  <MenuItem onClick={handleFAQ}>
                    <Icon src="/images/help-icon.svg" alt="Help" isDark={isDark} />
                    <MenuItemText>
                      <p>{t('faq')}</p>
                      <p>{currentLanguage === 'zh-CN' ? '查看帮助文档' : 'View help documentation'}</p>
                    </MenuItemText>
                  </MenuItem>
                  <MenuItem onClick={handleLogoutClick}>
                    <Icon src="/images/logout-icon.svg" alt="Logout" isDark={isDark} />
                    <MenuItemText>
                      <p>{t('logout')}</p>
                      <p>{currentLanguage === 'zh-CN' ? '断开钱包链接' : 'Disconnect wallet'}</p>
                    </MenuItemText>
                  </MenuItem>
                </MenuDropdown>
              </MenuContainerWrapper>
            </>
          ) : (
            <>
              <ConnectButton
                onClick={handleLogin}
                disabled={isConnecting}
              >
                {isConnecting ? t('connecting') : t('connectWallet')}
              </ConnectButton>
              <MenuContainerWrapper ref={menuButtonRef}>
                <MenuButton onClick={handleMenuClick} title={t('menu') || 'Menu'}>
                  <MenuButtonIcon src="/images/menu-icon.svg" alt="Menu" isDark={isDark} />
                </MenuButton>
                <MenuDropdown ref={menuRef} show={showMenu}>
                  <MenuItem onClick={handleLanguage}>
                    <Icon src="/images/language-icon.svg" alt="Language" isDark={isDark} />
                    <MenuItemText>
                      <p>{currentLanguage === 'zh-CN' ? '语言' : 'Language'}</p>
                      <p>{currentLanguage === 'zh-CN' ? '中英切换' : 'Switch Language'}</p>
                    </MenuItemText>
                  </MenuItem>
                  <MenuItem onClick={handleFAQ}>
                    <Icon src="/images/help-icon.svg" alt="Help" isDark={isDark} />
                    <MenuItemText>
                      <p>{t('faq')}</p>
                      <p>{currentLanguage === 'zh-CN' ? '查看帮助文档' : 'View help documentation'}</p>
                    </MenuItemText>
                  </MenuItem>
                </MenuDropdown>
              </MenuContainerWrapper>
            </>
          )}
        </RightSection>
      </MenuContainer>

      <InviteRegistrationModal
        isOpen={showInviteModal}
        onDismiss={() => setShowInviteModal(false)}
      />
      <MyInvitesModal
        isOpen={showMyInvitesModal}
        onDismiss={() => setShowMyInvitesModal(false)}
      />
      <FAQModal
        isOpen={showFAQModal}
        onDismiss={() => setShowFAQModal(false)}
      />
    </>
  )
}

export default Menu
