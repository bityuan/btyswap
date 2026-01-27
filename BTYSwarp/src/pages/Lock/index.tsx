import React, { useState } from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import PageHeader from 'components/PageHeader'
import Container from 'components/Container'
import AppBody from '../AppBody'
import CreateLock from './CreateLock'
import TokenLocks from './TokenLocks'
import LiquidityLocks from './LiquidityLocks'

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 1px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
`

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 12px 16px;
  background: ${({ active, theme }) => active ? theme.colors.primary : 'transparent'};
  color: ${({ active, theme }) => active ? 'white' : theme.colors.text};
  border: 1px solid ${({ active, theme }) => active ? theme.colors.primary : theme.colors.borderColor};
  border-radius: 8px;
  border-bottom: 1px solid ${({ active, theme }) => active ? theme.colors.primary : 'transparent'};
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${({ active, theme }) => active ? theme.colors.primary : theme.colors.background};
  }
`

enum LockTab {
  CREATE = 0,
  TOKEN = 1,
  LIQUIDITY = 2,
}

export default function Lock() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<LockTab>(LockTab.CREATE)

  return (
    <Container>
      <AppBody>
        <PageHeader title={t('lock')} description={t('lockDescription')} showSettings={false} />
        <TabContainer>
          <Tab
            active={activeTab === LockTab.CREATE}
            onClick={() => setActiveTab(LockTab.CREATE)}
          >
            {t('createLock')}
          </Tab>
          <Tab
            active={activeTab === LockTab.TOKEN}
            onClick={() => setActiveTab(LockTab.TOKEN)}
          >
            {t('tokenLocks')}
          </Tab>
          <Tab
            active={activeTab === LockTab.LIQUIDITY}
            onClick={() => setActiveTab(LockTab.LIQUIDITY)}
          >
            {t('liquidityLocks')}
          </Tab>
        </TabContainer>

        {activeTab === LockTab.CREATE && <CreateLock />}
        {activeTab === LockTab.TOKEN && <TokenLocks />}
        {activeTab === LockTab.LIQUIDITY && <LiquidityLocks />}
      </AppBody>
    </Container>
  )
}
