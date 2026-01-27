import React, { useState, useEffect, useMemo, useCallback } from 'react'
import styled from 'styled-components'
import { Text, Button } from '@pancakeswap-libs/uikit'
import { useTranslation } from 'react-i18next'
import { isMobile } from 'react-device-detect'
import Modal from 'components/Modal'
import { AutoColumn } from 'components/Column'
import { formatUnits } from '@ethersproject/units'
import { BigNumber } from '@ethersproject/bignumber'
import { TransactionResponse } from '@ethersproject/providers'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { useActiveWeb3React } from '../../hooks'
import { useToken } from '../../hooks/Tokens'
import { LockInfo } from '../../hooks/useLocks'
import { formatDate } from '../../utils/date'
import { useLockContract } from '../../hooks/useContract'
import TransactionConfirmationModal, { ConfirmationModalContent, TransactionErrorContent } from '../../components/TransactionConfirmationModal'

const ModalContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-height: 100%;
  overflow: hidden;
  padding: 16px;
  box-sizing: border-box;
  margin: 0;
  
  @media (max-width: 768px) {
    padding: 12px;
    max-height: 100%;
  }
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
`

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text};
  font-size: 24px;
  line-height: 1;
  
  &:hover {
    opacity: 0.7;
  }
`

const ScrollableContent = styled.div`
  flex: 1 1 auto;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding-right: 8px;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  position: relative;
  height: 0;
  
  @media (max-width: 768px) {
    max-height: calc(90vh - 200px) !important;
    padding-right: 4px;
    height: auto;
    min-height: 200px;
  }
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.tertiary};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.textSubtle};
    border-radius: 3px;
    
    &:hover {
      background: ${({ theme }) => theme.colors.text};
    }
  }
`

const Section = styled.div`
  margin-bottom: 8px;
`

const SectionTitle = styled(Text)`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${({ theme }) => theme.colors.text};
`

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  
  &:last-child {
    border-bottom: none;
  }
`

const DetailLabel = styled(Text)`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSubtle};
  min-width: 140px;
  flex-shrink: 0;
  white-space: nowrap;
`

const DetailValue = styled(Text)`
  text-align: right;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-right: 16px;
  gap: 8px;
  
  @media (max-width: 768px) {
    text-align: right;
    justify-content: flex-end;
  }
`

const AddressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
`

const AddressText = styled(Text)`
  font-family: monospace;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`

const CopyButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textSubtle};
  transition: opacity 0.2s;
  flex-shrink: 0;
  
  &:hover {
    opacity: 0.7;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`

const InfoBox = styled.div`
  background: ${({ theme }) => theme.colors.tertiary};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`

const ReleaseTable = styled.div`
  width: 100%;
  overflow-x: auto;
  margin-top: 16px;
`

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 1fr 100px;
  gap: 12px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.tertiary};
  border-radius: 8px 8px 0 0;
  font-weight: 600;
  font-size: 14px;
`

const TableHeaderCell = styled(Text)`
  color: ${({ theme }) => theme.colors.textSubtle};
`

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 1fr 100px;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${({ theme }) => theme.colors.tertiary};
  }
`

const TableCell = styled(Text)`
  font-size: 14px;
`

const StatusBadge = styled.span<{ status: 'released' | 'available' | 'pending' }>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ theme, status }) => {
    if (status === 'released') return theme.colors.success
    if (status === 'available') return theme.colors.warning
    return theme.colors.textSubtle
  }};
  color: ${({ theme }) => theme.colors.invertedContrast};
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.borderColor};
`

const ActionButton = styled(Button)`
  flex: 1;
`

interface LockDetailModalProps {
  isOpen: boolean
  onDismiss: () => void
  lock: LockInfo | null
}

interface ReleaseRecord {
  period: number
  releaseDate: Date
  releaseAmount: string
  status: 'released' | 'available' | 'pending'
}

export default function LockDetailModal({ isOpen, onDismiss, lock }: LockDetailModalProps) {
  const { t } = useTranslation()
  const token = useToken(lock?.token)
  const lockContract = useLockContract(true)
  const { account } = useActiveWeb3React()
  const addTransaction = useTransactionAdder()
  const [withdrawableAmount, setWithdrawableAmount] = useState<BigNumber | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false)
  const [unlockTxHash, setUnlockTxHash] = useState<string | undefined>(undefined)

  const isVesting = lock ? lock.tgeBps > 0 && lock.cycle > 0 : false
  const isCliff = lock ? lock.cycle === 0 : false
  const decimals = token?.decimals || 18

  // Calculate release records for both cliff and vesting locks
  const releaseRecords = useMemo<ReleaseRecord[]>(() => {
    if (!lock) return []

    const records: ReleaseRecord[] = []
    const amountBN = BigNumber.from(lock.amount)
    const unlockedAmountBN = BigNumber.from(lock.unlockedAmount)
    const currentTime = Math.floor(Date.now() / 1000)

    if (isCliff) {
      // Cliff lock: single release at unlock date
      const releaseDate = new Date(lock.tgeDate * 1000)
      const isReleased = unlockedAmountBN.gte(amountBN)
      const isAvailable = currentTime >= lock.tgeDate && !isReleased

      records.push({
        period: 0,
        releaseDate,
        releaseAmount: formatUnits(amountBN, decimals),
        status: isReleased ? 'released' : isAvailable ? 'available' : 'pending',
      })
    } else if (isVesting) {
      // Vesting lock: TGE + multiple cycles
      const tgeDate = new Date(lock.tgeDate * 1000)
      const cycleSeconds = lock.cycle

      // Calculate TGE release amount
      const tgeReleaseAmount = amountBN.mul(lock.tgeBps).div(10000)
      const tgeIsReleased = unlockedAmountBN.gte(tgeReleaseAmount)
      const tgeIsAvailable = currentTime >= lock.tgeDate && !tgeIsReleased

      records.push({
        period: 0,
        releaseDate: tgeDate,
        releaseAmount: formatUnits(tgeReleaseAmount, decimals),
        status: tgeIsReleased ? 'released' : tgeIsAvailable ? 'available' : 'pending',
      })

      // Calculate cycle releases
      const cycleReleaseAmount = amountBN.mul(lock.cycleBps).div(10000)
      let totalReleased = tgeReleaseAmount
      let period = 1

      while (totalReleased.lt(amountBN)) {
        const releaseDate = new Date(tgeDate.getTime() + period * cycleSeconds * 1000)
        const thisReleaseAmount = totalReleased.add(cycleReleaseAmount).gt(amountBN)
          ? amountBN.sub(totalReleased)
          : cycleReleaseAmount

        const isReleased = unlockedAmountBN.gte(totalReleased.add(thisReleaseAmount))
        const isAvailable = currentTime >= releaseDate.getTime() / 1000 && !isReleased && unlockedAmountBN.lt(totalReleased.add(thisReleaseAmount))

        records.push({
          period,
          releaseDate,
          releaseAmount: formatUnits(thisReleaseAmount, decimals),
          status: isReleased ? 'released' : isAvailable ? 'available' : 'pending',
        })

        totalReleased = totalReleased.add(thisReleaseAmount)
        if (totalReleased.gte(amountBN)) break
        period++
      }
    }

    return records
  }, [lock, isVesting, isCliff, decimals])

  // Calculate estimated full unlock date
  const estimatedFullUnlockDate = useMemo(() => {
    if (!lock || isCliff) return null
    if (isVesting && releaseRecords.length > 0) {
      const lastRecord = releaseRecords[releaseRecords.length - 1]
      return lastRecord.releaseDate
    }
    return null
  }, [lock, isCliff, isVesting, releaseRecords])

  // Fetch withdrawable amount
  useEffect(() => {
    if (!lock || !lockContract || !lock.id || lock.id === '' || lock.id === '0') {
      setWithdrawableAmount(null)
      return undefined
    }

    let cancelled = false

    const fetchWithdrawable = async () => {
      try {
        // Validate and convert lock.id to BigNumber
        if (!lock.id || lock.id === '' || lock.id === '0') {
          if (!cancelled) {
            setWithdrawableAmount(null)
          }
          return
        }

        // Convert lock.id to BigNumber to ensure correct format for contract call
        let lockIdBN: BigNumber
        try {
          lockIdBN = BigNumber.from(lock.id)
        } catch (parseError) {
          console.error('Failed to parse lock.id to BigNumber:', parseError, { lockId: lock.id, lockIdType: typeof lock.id })
          if (!cancelled) {
            setWithdrawableAmount(null)
          }
          return
        }

        if (lockIdBN.isZero()) {
          if (!cancelled) {
            setWithdrawableAmount(null)
          }
          return
        }

        // Ensure lockContract is valid
        if (!lockContract) {
          console.error('Invalid lockContract', { lockContract })
          if (!cancelled) {
            setWithdrawableAmount(null)
          }
          return
        }

        // Check if contract has the function
        const hasWithdrawableTokens = typeof lockContract.withdrawableTokens === 'function'
        const hasGetWithdrawable = typeof lockContract.getWithdrawable === 'function'
        
        if (!hasWithdrawableTokens && !hasGetWithdrawable) {
          console.error('Neither withdrawableTokens nor getWithdrawable function found', {
            contractAddress: lockContract.address,
            contractMethods: Object.keys(lockContract)
          })
          if (!cancelled) {
            setWithdrawableAmount(null)
          }
          return
        }

        // For normal locks (cycle == 0), withdrawableTokens returns 0
        // We need to calculate manually: if time has passed, withdrawable = amount - unlockedAmount
        if (lock.cycle === 0) {
          // Normal lock: check if unlock time has passed
          const currentTime = Math.floor(Date.now() / 1000)
          if (!cancelled) {
            if (currentTime >= lock.tgeDate && lock.unlockedAmount < lock.amount) {
              // Time has passed and not fully unlocked
              const amountBN = BigNumber.from(lock.amount)
              const unlockedAmountBN = BigNumber.from(lock.unlockedAmount)
              const withdrawableBN = amountBN.sub(unlockedAmountBN)
              setWithdrawableAmount(withdrawableBN)
            } else {
              // Time hasn't passed or already fully unlocked
              setWithdrawableAmount(BigNumber.from(0))
            }
          }
        } else {
          // Vesting lock: use contract function
          const withdrawableFunction = hasWithdrawableTokens ? lockContract.withdrawableTokens : lockContract.getWithdrawable
          const withdrawable = await withdrawableFunction(lockIdBN)
          if (!cancelled) {
            setWithdrawableAmount(withdrawable)
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch withdrawable amount:', err, { 
          lockId: lock.id,
          lockIdType: typeof lock.id,
          errorMessage: err?.message,
          errorCode: err?.code
        })
        if (!cancelled) {
          setWithdrawableAmount(null)
        }
      }
    }

    fetchWithdrawable()
    const interval = setInterval(fetchWithdrawable, 10000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [lock, lockContract])

  const handleUnlock = useCallback(async () => {
    if (!lock || !lockContract || !account) return

    // Validate lock.id
    if (!lock.id || lock.id === '' || lock.id === '0') {
      setError('Invalid lock ID')
      return
    }

    setIsUnlocking(true)
    setError(null)
    setUnlockTxHash(undefined)

    try {
      // Convert lock.id to BigNumber to ensure correct format for contract call
      const lockIdBN = BigNumber.from(lock.id)
      if (lockIdBN.isZero()) {
        setError('Invalid lock ID')
        setIsUnlocking(false)
        return
      }

      const tx: TransactionResponse = await lockContract.unlock(lockIdBN)
      addTransaction(tx, {
        summary: `Unlock ${token?.symbol || 'tokens'}`,
      })

      setUnlockTxHash(tx.hash)
      await tx.wait()

      // Refresh withdrawable amount
      const withdrawable = await (lockContract.withdrawableTokens || lockContract.getWithdrawable)(lockIdBN)
      setWithdrawableAmount(withdrawable)

      // 交易成功后自动关闭确认模态框
      setTimeout(() => {
        setShowUnlockConfirm(false)
      }, 2000) // 2秒后自动关闭，让用户看到成功信息
    } catch (err: any) {
      console.error('Failed to unlock:', err)
      setError(err?.message || 'Failed to unlock tokens')
      setUnlockTxHash(undefined)
    } finally {
      setIsUnlocking(false)
    }
  }, [lock, lockContract, account, token, addTransaction])

  const handleUnlockClick = useCallback(() => {
    setShowUnlockConfirm(true)
    setError(null)
  }, [])

  const handleUnlockConfirmDismiss = useCallback(() => {
    setShowUnlockConfirm(false)
    if (unlockTxHash) {
      setUnlockTxHash(undefined)
    }
  }, [unlockTxHash])

  const unlockModalContent = useCallback(() => {
    if (error) {
      return <TransactionErrorContent message={error} onDismiss={handleUnlockConfirmDismiss} />
    }
    return (
      <ConfirmationModalContent
        title={t('unlock') || 'Unlock Tokens'}
        onDismiss={handleUnlockConfirmDismiss}
        topContent={() => (
          <AutoColumn gap="md">
            <Text fontSize="16px" textAlign="center">
              {t('confirmUnlock') || 'Are you sure you want to unlock the available tokens?'}
            </Text>
            {withdrawableAmount && (
              <Text fontSize="14px" color="textSubtle" textAlign="center">
                {t('withdrawableAmount') || 'Withdrawable'}: {formatUnits(withdrawableAmount, decimals)}
              </Text>
            )}
          </AutoColumn>
        )}
        bottomContent={() => (
          <Button
            variant="primary"
            onClick={handleUnlock}
            disabled={isUnlocking}
            width="100%"
          >
            {isUnlocking ? (t('unlocking') || 'Unlocking...') : (t('confirm') || 'Confirm')}
          </Button>
        )}
      />
    )
  }, [error, handleUnlockConfirmDismiss, t, withdrawableAmount, decimals, handleUnlock, isUnlocking])

  // Adjust modal position on mount/unmount
  useEffect(() => {
    if (isOpen) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        const dialogContent = document.querySelector('[role="dialog"]') as HTMLElement
        if (dialogContent) {
          if (isMobile) {
            dialogContent.style.setProperty('width', '100vw', 'important')
            dialogContent.style.setProperty('max-width', '100vw', 'important')
            dialogContent.style.setProperty('height', '100vh', 'important')
            dialogContent.style.setProperty('max-height', '100vh', 'important')
            dialogContent.style.setProperty('margin', '0', 'important')
            dialogContent.style.setProperty('border-radius', '0', 'important')
          } else {
            dialogContent.style.setProperty('width', '85vw', 'important')
            dialogContent.style.setProperty('max-width', '1100px', 'important')
            dialogContent.style.setProperty('max-height', '90vh', 'important')
            dialogContent.style.setProperty('margin-bottom', '80px', 'important')
          }
          dialogContent.style.setProperty('overflow', 'hidden', 'important')
          dialogContent.style.setProperty('display', 'flex', 'important')
          dialogContent.style.setProperty('flex-direction', 'column', 'important')
          dialogContent.style.setProperty('padding', '0', 'important')
        }
      }, 100)
    } else {
      const dialogContent = document.querySelector('[role="dialog"]') as HTMLElement
      if (dialogContent) {
        dialogContent.style.removeProperty('width')
        dialogContent.style.removeProperty('max-width')
        dialogContent.style.removeProperty('height')
        dialogContent.style.removeProperty('max-height')
        dialogContent.style.removeProperty('margin')
        dialogContent.style.removeProperty('margin-bottom')
        dialogContent.style.removeProperty('overflow')
        dialogContent.style.removeProperty('display')
        dialogContent.style.removeProperty('flex-direction')
        dialogContent.style.removeProperty('border-radius')
        dialogContent.style.removeProperty('padding')
      }
    }
  }, [isOpen])

  if (!lock) return null

  const amountBN = BigNumber.from(lock.amount)
  const unlockedAmountBN = BigNumber.from(lock.unlockedAmount)
  const remainingAmountBN = amountBN.sub(unlockedAmountBN)

  const formattedAmount = formatUnits(amountBN, decimals)
  const formattedUnlockedAmount = formatUnits(unlockedAmountBN, decimals)
  const formattedRemainingAmount = formatUnits(remainingAmountBN, decimals)
  const formattedWithdrawable = withdrawableAmount ? formatUnits(withdrawableAmount, decimals) : '0'

  const displayAmount = parseFloat(formattedAmount).toLocaleString('en-US', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  })
  const displayUnlockedAmount = parseFloat(formattedUnlockedAmount).toLocaleString('en-US', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  })
  const displayRemainingAmount = parseFloat(formattedRemainingAmount).toLocaleString('en-US', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  })
  const displayWithdrawable = parseFloat(formattedWithdrawable).toLocaleString('en-US', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  })

  const canUnlock = withdrawableAmount && withdrawableAmount.gt(0)
  const isOwner = account && account.toLowerCase() === lock.owner.toLowerCase()

  // 格式化地址显示：前6位...后6位
  const formatAddress = (address: string) => {
    if (!address) return ''
    if (address.length <= 12) return address
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  // 复制到剪贴板
  const copyToClipboard = async (text: string, addressKey: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        setCopiedAddress(addressKey)
        setTimeout(() => setCopiedAddress(null), 2000)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        if (successful) {
          setCopiedAddress(addressKey)
          setTimeout(() => setCopiedAddress(null), 2000)
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyAddress = (address: string, addressKey: string) => {
    copyToClipboard(address, addressKey)
  }

  // 手机端全屏显示，并阻止背景点击关闭
  // 使用 react-device-detect 的 isMobile，这是项目中标准的手机端判断方式
  const isMobileDevice = isMobile
  
  const pendingText = `Unlocking ${withdrawableAmount ? formatUnits(withdrawableAmount, decimals) : '0'} ${token?.symbol || 'tokens'}`
  
  return (
    <>
      <TransactionConfirmationModal
        isOpen={showUnlockConfirm}
        onDismiss={handleUnlockConfirmDismiss}
        attemptingTxn={isUnlocking}
        hash={unlockTxHash}
        content={unlockModalContent}
        pendingText={pendingText}
      />
      <Modal 
        isOpen={isOpen} 
        onDismiss={onDismiss} 
        maxHeight={isMobileDevice ? 100 : 90}
        minHeight={isMobileDevice ? 100 : false}
        disableBackdropClick={isMobileDevice}
      >
        <ModalContainer>
        <Header>
          <Text fontSize="20px" fontWeight="600">
            {t('lockDetails')}
          </Text>
          <CloseButton onClick={onDismiss} aria-label="Close">
            ×
          </CloseButton>
        </Header>

        <ScrollableContent>
          <AutoColumn gap="24px">
            {/* 1. Lock Overview Section */}
            <Section>
              <SectionTitle>{t('lockOverview') || 'Lock Overview'}</SectionTitle>
              {lock.description && (
                <DetailRow>
                  <DetailLabel>{t('description')}:</DetailLabel>
                  <DetailValue>{lock.description}</DetailValue>
                </DetailRow>
              )}
              <DetailRow>
                <DetailLabel>{t('token')}:</DetailLabel>
                <DetailValue>{token?.symbol || lock.token}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>{t('tokenAddress')}:</DetailLabel>
                <DetailValue>
                  <AddressContainer>
                    <AddressText>{formatAddress(lock.token)}</AddressText>
                    <CopyButton onClick={() => handleCopyAddress(lock.token, 'token')} title={t('copy') || 'Copy'}>
                      {copiedAddress === 'token' ? (
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor" />
                        </svg>
                      )}
                    </CopyButton>
                  </AddressContainer>
                </DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>{t('lockType')}:</DetailLabel>
                <DetailValue>{isCliff ? t('normalLock') : isVesting ? t('vestingLock') : '-'}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>{t('owner')}:</DetailLabel>
                <DetailValue>
                  <AddressContainer>
                    <AddressText>{formatAddress(lock.owner)}</AddressText>
                    <CopyButton onClick={() => handleCopyAddress(lock.owner, 'owner')} title={t('copy') || 'Copy'}>
                      {copiedAddress === 'owner' ? (
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor" />
                        </svg>
                      )}
                    </CopyButton>
                  </AddressContainer>
                </DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>{t('lockDate')}:</DetailLabel>
                <DetailValue>{formatDate(new Date(lock.lockDate * 1000))}</DetailValue>
              </DetailRow>
            </Section>

            {/* 2. Release Model Section */}
            <Section>
              <SectionTitle>{t('releaseModel') || 'Release Model'}</SectionTitle>
              {isCliff ? (
                <InfoBox>
                  <InfoRow>
                    <Text fontSize="14px" color="textSubtle">{t('unlockDate')}:</Text>
                    <Text fontSize="14px" fontWeight="600">{formatDate(new Date(lock.tgeDate * 1000))}</Text>
                  </InfoRow>
                  <InfoRow>
                    <Text fontSize="14px" color="textSubtle">{t('releasePercent') || 'Release Percent'}:</Text>
                    <Text fontSize="14px" fontWeight="600">100%</Text>
                  </InfoRow>
                </InfoBox>
              ) : isVesting ? (
                <InfoBox>
                  <InfoRow>
                    <Text fontSize="14px" color="textSubtle">{t('tgeDate')}:</Text>
                    <Text fontSize="14px" fontWeight="600">{formatDate(new Date(lock.tgeDate * 1000))}</Text>
                  </InfoRow>
                  <InfoRow>
                    <Text fontSize="14px" color="textSubtle">{t('tgePercent')}:</Text>
                    <Text fontSize="14px" fontWeight="600">{(lock.tgeBps / 100).toFixed(2)}%</Text>
                  </InfoRow>
                  <InfoRow>
                    <Text fontSize="14px" color="textSubtle">{t('cycleDays')}:</Text>
                    <Text fontSize="14px" fontWeight="600">{lock.cycle / 86400} {t('days')}</Text>
                  </InfoRow>
                  <InfoRow>
                    <Text fontSize="14px" color="textSubtle">{t('cycleReleasePercent')}:</Text>
                    <Text fontSize="14px" fontWeight="600">{(lock.cycleBps / 100).toFixed(2)}%</Text>
                  </InfoRow>
                  {estimatedFullUnlockDate && (
                    <InfoRow>
                      <Text fontSize="14px" color="textSubtle">{t('estimatedFullUnlockDate') || 'Estimated Full Unlock Date'}:</Text>
                      <Text fontSize="14px" fontWeight="600">{formatDate(estimatedFullUnlockDate)}</Text>
                    </InfoRow>
                  )}
                </InfoBox>
              ) : null}
            </Section>

            {/* 3. Release Schedule Table */}
            {releaseRecords.length > 0 && (
              <Section>
                <SectionTitle>{t('releaseSchedule') || 'Release Schedule'}</SectionTitle>
                <ReleaseTable>
                  <TableHeader>
                    <TableHeaderCell>{t('period') || 'Period'}</TableHeaderCell>
                    <TableHeaderCell>{t('releaseDate') || 'Date'}</TableHeaderCell>
                    <TableHeaderCell>{t('releaseAmount') || 'Amount'}</TableHeaderCell>
                    <TableHeaderCell>{t('status') || 'Status'}</TableHeaderCell>
                  </TableHeader>
                  {releaseRecords.map((record) => (
                    <TableRow key={record.period}>
                      <TableCell>
                        {record.period === 0 ? t('tge') || 'TGE' : `${record.period}`}
                      </TableCell>
                      <TableCell>{formatDate(record.releaseDate)}</TableCell>
                      <TableCell>
                        {parseFloat(record.releaseAmount).toLocaleString('en-US', {
                          maximumFractionDigits: 6,
                          minimumFractionDigits: 0,
                        })}{' '}
                        {token?.symbol || ''}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.status}>
                          {record.status === 'released' 
                            ? t('released') || 'Released'
                            : record.status === 'available'
                            ? t('available') || 'Available'
                            : t('pending') || 'Pending'}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </ReleaseTable>
              </Section>
            )}

            {/* 4. Balance & Claim Section */}
            <Section>
              <SectionTitle>{t('balanceAndClaim') || 'Balance & Claim'}</SectionTitle>
              <InfoBox>
                <InfoRow>
                  <Text fontSize="14px" color="textSubtle">{t('totalLocked') || 'Total Locked'}:</Text>
                  <Text fontSize="14px" fontWeight="600">
                    {displayAmount} {token?.symbol || ''}
                  </Text>
                </InfoRow>
                <InfoRow>
                  <Text fontSize="14px" color="textSubtle">{t('released') || 'Released'}:</Text>
                  <Text fontSize="14px" fontWeight="600">
                    {displayUnlockedAmount} {token?.symbol || ''}
                  </Text>
                </InfoRow>
                <InfoRow>
                  <Text fontSize="14px" color="textSubtle">{t('remainingLocked') || 'Remaining Locked'}:</Text>
                  <Text fontSize="14px" fontWeight="600">
                    {displayRemainingAmount} {token?.symbol || ''}
                  </Text>
                </InfoRow>
                {canUnlock && (
                  <InfoRow>
                    <Text fontSize="14px" color="textSubtle">{t('availableToClaim') || 'Available to Claim'}:</Text>
                    <Text fontSize="14px" fontWeight="600" color="success">
                      {displayWithdrawable} {token?.symbol || ''}
                    </Text>
                  </InfoRow>
                )}
              </InfoBox>
            </Section>
          </AutoColumn>
        </ScrollableContent>

        {error && (
          <Text color="failure" fontSize="14px" mt="16px" textAlign="center">
            {error}
          </Text>
        )}

        {isOwner && (
          <ButtonGroup>
            {canUnlock ? (
              <ActionButton
                onClick={handleUnlockClick}
                disabled={isUnlocking || !canUnlock}
              >
                {t('withdrawAvailableTokens') || 'Withdraw Available Tokens'}
              </ActionButton>
            ) : (
              <ActionButton disabled>
                {Date.now() < lock.tgeDate * 1000
                  ? t('notYetUnlockable') || 'Not yet unlockable'
                  : t('noTokensToUnlock') || 'No tokens to unlock'}
              </ActionButton>
            )}
            <ActionButton variant="text" onClick={onDismiss}>
              {t('close')}
            </ActionButton>
          </ButtonGroup>
        )}

        {!isOwner && (
          <ActionButton onClick={onDismiss} mt="16px">
            {t('close')}
          </ActionButton>
        )}
      </ModalContainer>
    </Modal>
    </>
  )
}
