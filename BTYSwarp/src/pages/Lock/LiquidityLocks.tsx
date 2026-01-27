import React, { useState } from 'react'
import styled from 'styled-components'
import { CardBody, Text, Button } from '@pancakeswap-libs/uikit'
import { useTranslation } from 'react-i18next'
import { AutoColumn } from 'components/Column'
import { LightCard } from 'components/Card'
import { useActiveWeb3React } from 'hooks'
import CurrencyLogo from 'components/CurrencyLogo'
import { formatUnits } from '@ethersproject/units'
import { BigNumber } from '@ethersproject/bignumber'
import { useLpLocksForUser, useAllLpLocks, LockInfo } from '../../hooks/useLocks'
import { useToken } from '../../hooks/Tokens'
import LockDetailModal from './LockDetailModal'

const StyledButtonMenu = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
`

const TabButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 8px 16px;
  background: ${({ active, theme }) => active ? theme.colors.primary : 'transparent'};
  color: ${({ active, theme }) => active ? 'white' : theme.colors.text};
  border: 1px solid ${({ active, theme }) => active ? theme.colors.primary : theme.colors.borderColor};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${({ active, theme }) => active ? theme.colors.primary : theme.colors.tertiary};
    border-color: ${({ active, theme }) => active ? theme.colors.primary : theme.colors.primary};
  }
`

const TableContainer = styled(LightCard)`
  padding: 16px;
  box-shadow: ${({ theme }) => theme.isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'};
`

const TableHeader = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
`

const TableHeaderCell = styled.div<{ flex?: number; width?: string }>`
  flex: ${({ flex }) => flex || 1};
  ${({ width }) => width ? `width: ${width}; flex: 0 0 ${width};` : ''}
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
`

const TableBody = styled.div`
  display: flex;
  flex-direction: column;
`

const TableRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  border-bottom: 1px dashed ${({ theme }) => theme.colors.borderColor};
  
  &:last-child {
    border-bottom: none;
  }
`

const TableCell = styled.div<{ flex?: number; width?: string }>`
  flex: ${({ flex }) => flex || 1};
  ${({ width }) => width ? `width: ${width}; flex: 0 0 ${width};` : ''}
  display: flex;
  align-items: center;
`

const TokenIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.borderColor};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background};
  flex-shrink: 0;
`

const TokenDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const TokenName = styled.div`
  font-weight: 500;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
`

const TokenAddress = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSubtle};
`

const AmountText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
`

const ViewLink = styled(Button)`
  padding: 4px 12px;
  font-size: 12px;
  min-width: 64px;
`

enum LiquidityLockSubTab {
  MY_LOCKS = 0,
  ALL = 1,
}

function LockListItem({ lock, onView }: { lock: LockInfo; onView: () => void }) {
  const token = useToken(lock.token)
  const tokenSymbol = token?.symbol || 'LP'
  const tokenName = token?.name || tokenSymbol
  const tokenAddress = lock.token
  const displayAddress = `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`
  
  // Format amount - lock.amount is stored as hex string, convert to BigNumber first
  const decimals = token?.decimals || 18
  const amountBN = BigNumber.from(lock.amount)
  const formattedAmount = formatUnits(amountBN, decimals)
  const displayAmount = parseFloat(formattedAmount).toLocaleString('en-US', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0
  })

  return (
    <TableRow>
      <TableCell width="44px">
        <TokenIcon>
          <CurrencyLogo currency={token || undefined} size="44px" />
        </TokenIcon>
      </TableCell>
      <TableCell flex={1}>
        <TokenDetails>
          <TokenName>{tokenName}</TokenName>
          <TokenAddress>{displayAddress}</TokenAddress>
        </TokenDetails>
      </TableCell>
      <TableCell flex={1}>
        <AmountText>
          {displayAmount} {tokenSymbol}
        </AmountText>
      </TableCell>
      <TableCell width="64px">
        <ViewLink scale="sm" variant="text" onClick={onView}>
          View
        </ViewLink>
      </TableCell>
    </TableRow>
  )
}

export default function LiquidityLocks() {
  const { t } = useTranslation()
  const { account } = useActiveWeb3React()
  const [activeSubTab, setActiveSubTab] = useState<LiquidityLockSubTab>(LiquidityLockSubTab.MY_LOCKS)
  const [selectedLock, setSelectedLock] = useState<LockInfo | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const { locks: myLocks, loading: myLocksLoading, error: myLocksError } = useLpLocksForUser(account)
  const { locks: allLocks, loading: allLocksLoading, error: allLocksError } = useAllLpLocks()

  const locks = activeSubTab === LiquidityLockSubTab.ALL ? allLocks : myLocks
  const loading = activeSubTab === LiquidityLockSubTab.ALL ? allLocksLoading : myLocksLoading
  const error = activeSubTab === LiquidityLockSubTab.ALL ? allLocksError : myLocksError

  const handleViewLock = (lock: LockInfo) => {
    setSelectedLock(lock)
    setShowDetailModal(true)
  }

  const handleTabChange = (index: number) => {
    const tab = index === 0 ? LiquidityLockSubTab.MY_LOCKS : LiquidityLockSubTab.ALL
    setActiveSubTab(tab)
  }

  return (
    <>
      <CardBody>
        <AutoColumn gap="20px">
          <StyledButtonMenu>
            <TabButton
              active={activeSubTab === LiquidityLockSubTab.MY_LOCKS}
              onClick={() => handleTabChange(0)}
            >
              {t('myLocks')}
            </TabButton>
            <TabButton
              active={activeSubTab === LiquidityLockSubTab.ALL}
              onClick={() => handleTabChange(1)}
            >
              {t('allLocks')}
            </TabButton>
          </StyledButtonMenu>

          {activeSubTab === LiquidityLockSubTab.MY_LOCKS && !account ? (
            <LightCard padding="40px">
              <Text color="textDisabled" textAlign="center">
                {t('connectWalletViewLocks')}
              </Text>
            </LightCard>
          ) : loading ? (
            <LightCard padding="40px">
              <Text color="textSubtle" textAlign="center">
                {t('loadingLocks')}
              </Text>
            </LightCard>
          ) : error ? (
            <LightCard padding="40px">
              <Text color="failure" textAlign="center">
                {t('failedToLoadLocks') || 'Failed to load locks'}
              </Text>
            </LightCard>
          ) : locks.length === 0 ? (
            <LightCard padding="40px">
              <Text color="textDisabled" textAlign="center">
                {t('noLocksFound')}
              </Text>
            </LightCard>
          ) : (
            <TableContainer>
              <TableHeader>
                <TableHeaderCell width="44px">
                  {/* Empty cell for icon */}
                </TableHeaderCell>
                <TableHeaderCell flex={1}>
                  <Text fontWeight="600">{t('liquidityPair')}</Text>
                </TableHeaderCell>
                <TableHeaderCell flex={1}>
                  <Text fontWeight="600">{t('amount')}</Text>
                </TableHeaderCell>
                <TableHeaderCell width="64px">
                  {/* Empty cell for view button */}
                </TableHeaderCell>
              </TableHeader>
              <TableBody>
                {locks.map((lock) => (
                  <LockListItem
                    key={lock.id}
                    lock={lock}
                    onView={() => handleViewLock(lock)}
                  />
                ))}
              </TableBody>
            </TableContainer>
          )}
        </AutoColumn>
      </CardBody>

      <LockDetailModal
        isOpen={showDetailModal}
        onDismiss={() => {
          setShowDetailModal(false)
          setSelectedLock(null)
        }}
        lock={selectedLock}
      />
    </>
  )
}
