import React, { useState, useRef } from 'react'
import { useWeb3React } from '@web3-react/core'
import styled from 'styled-components'
import { Button } from '@pancakeswap-libs/uikit'
import { useTranslation } from 'react-i18next'
import useDirectAuth from '../../hooks/useDirectAuth'
import useLanguage from '../../hooks/useLanguage'
import UserMenu from '../UserMenu'
import { FAQButton } from '../FAQ'

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
`

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
  
  img {
    width: 48px;
    height: 48px;
  }
`

const ConnectButton = styled(Button)`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
`

const UserMenuContainer = styled.div`
  position: relative;
  display: inline-block;
`

const LanguageButton = styled(Button)`
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.borderColor};
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 14px;
  min-width: 60px;
  
  &:hover {
    background: ${({ theme }) => theme.colors.tertiary};
  }
`

const Menu: React.FC = () => {
  const { account } = useWeb3React()
  const { handleLogin, handleLogout, isConnecting } = useDirectAuth()
  const { t } = useTranslation()
  const { currentLanguage, toggleLanguage } = useLanguage()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const accountButtonRef = useRef<HTMLDivElement>(null)

  const handleAccountClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (account) {
      setShowUserMenu(!showUserMenu)
    } else {
      handleLogin()
    }
  }

  return (
    <MenuContainer>
      <LeftSection>
        <Logo>
          <img src="/images/logo.png" alt="BTY" />
        </Logo>
      </LeftSection>

      <RightSection>
        <FAQButton />
        <LanguageButton variant="text" onClick={toggleLanguage}>
          {currentLanguage === 'zh-CN' ? 'CN' : 'EN'}
        </LanguageButton>
        <UserMenuContainer ref={accountButtonRef}>
          <ConnectButton
            onClick={handleAccountClick}
            disabled={isConnecting}
          >
            {isConnecting
              ? t('connecting')
              : account
                ? `${account.slice(0, 6)}...${account.slice(-4)}`
                : t('connectWallet')
            }
          </ConnectButton>
          {account && (
            <UserMenu
              show={showUserMenu}
              onClose={() => setShowUserMenu(false)}
              onLogout={handleLogout}
              buttonRef={accountButtonRef}
            />
          )}
        </UserMenuContainer>
      </RightSection>
    </MenuContainer>
  )
}

export default Menu
