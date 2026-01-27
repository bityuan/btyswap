import React, { ReactNode } from 'react'
import styled from 'styled-components'
import { Heading, IconButton, Text, Flex, useModal, TuneIcon, HistoryIcon } from '@pancakeswap-libs/uikit'
import { useTranslation } from 'react-i18next'
import SettingsModal from './SettingsModal'
import RecentTransactionsModal from './RecentTransactionsModal'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  showSettings?: boolean
}

const StyledPageHeader = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
  padding: 24px;
`

const Details = styled.div`
  flex: 1;
`

const PageHeader = ({ title, description, children, showSettings = true }: PageHeaderProps) => {
  const { t } = useTranslation()
  const [onPresentSettings] = useModal(<SettingsModal translateString={t} />)
  const [onPresentRecentTransactions] = useModal(<RecentTransactionsModal translateString={t} />)

  return (
    <StyledPageHeader>
      <Flex alignItems="center">
        <Details>
          <Heading mb="8px">{title}</Heading>
          {description && (
            <Text color="textSubtle" fontSize="14px">
              {description}
            </Text>
          )}
        </Details>
        {showSettings && (
          <>
            <IconButton variant="text" onClick={onPresentSettings} title={t('settings')}>
              <TuneIcon width="24px" color="currentColor" />
            </IconButton>
            <IconButton
              variant="text"
              onClick={onPresentRecentTransactions}
              title={t('recentTransactions')}
            >
              <HistoryIcon width="24px" color="currentColor" />
            </IconButton>
          </>
        )}
      </Flex>
      {children && <Text mt="16px">{children}</Text>}
    </StyledPageHeader>
  )
}

export default PageHeader
