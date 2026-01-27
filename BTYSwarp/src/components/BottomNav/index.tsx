import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import useTheme from '../../hooks/useTheme'

const BottomNavContainer = styled.div`
  position: fixed;
  bottom: 8px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 0 12px;
  z-index: 40;
`

const NavBar = styled.div`
  background: ${({ theme }) => theme.colors.invertedContrast || theme.colors.background};
  height: 48px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.borderColor};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
  max-width: 32rem;
  width: 100%;
  padding: 0 12px;
`

const NavItem = styled(Link).withConfig({
  shouldForwardProp: (prop: string | number) => String(prop) !== 'active',
})<{ active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: 1;
  padding: 4px 8px;
  text-decoration: none;
  color: ${({ theme, active }) => (active ? theme.colors.primary : theme.colors.textSubtle)};
  transition: color 0.2s;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const NavIcon = styled.img.withConfig({
  shouldForwardProp: (prop: string | number) => String(prop) !== 'active' && String(prop) !== 'isDark',
})<{ isDark?: boolean; active?: boolean }>`
  width: 24px;
  height: 24px;
  margin-bottom: 2px;
  filter: ${({ isDark }) => 
    isDark 
      ? 'brightness(0) invert(1)' 
      : 'brightness(0)'
  };
  opacity: ${({ active }) => (active ? 1 : 0.7)};
  transition: opacity 0.2s;
`

const NavText = styled.span`
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
`

interface NavItemConfig {
  path: string
  icon: string
  labelKey: string
}

const BottomNav: React.FC = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const { isDark } = useTheme()

  const navItems: NavItemConfig[] = [
    { path: '/swap', icon: '/images/swap-icon.svg', labelKey: 'swap' },
    { path: '/pool', icon: '/images/liquidity-icon.svg', labelKey: 'liquidity' },
    { path: '/lock', icon: '/images/lock-bottom-icon.svg', labelKey: 'lock' },
    { path: '/create-token', icon: '/images/tokenize-icon.svg', labelKey: 'tokenize' },
  ]

  return (
    <BottomNavContainer>
      <NavBar>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/pool' && location.pathname.startsWith('/add')) ||
            (item.path === '/pool' && location.pathname.startsWith('/remove'))
          return (
            <NavItem key={item.path} to={item.path} active={isActive}>
              <NavIcon src={item.icon} alt={t(item.labelKey)} isDark={isDark} active={isActive} />
              <NavText>{t(item.labelKey)}</NavText>
            </NavItem>
          )
        })}
      </NavBar>
    </BottomNavContainer>
  )
}

export default BottomNav
