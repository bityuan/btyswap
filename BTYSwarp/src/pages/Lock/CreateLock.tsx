import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { parseUnits } from '@ethersproject/units'
import { TransactionResponse } from '@ethersproject/providers'
import { Token, TokenAmount } from '@btyswap-libs/sdk'
import { Button, CardBody, Text, Input as UIKitInput } from '@pancakeswap-libs/uikit'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { AutoColumn } from 'components/Column'
import { LightCard } from 'components/Card'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import { useActiveWeb3React } from 'hooks'
import { useCurrency } from 'hooks/Tokens'
import { useTokenBalance } from 'state/wallet/hooks'
import { useLockContract } from 'hooks/useContract'
import { useApproveCallback, ApprovalState } from 'hooks/useApproveCallback'
import { useTransactionAdder, useHasPendingApproval } from 'state/transactions/hooks'
import TransactionConfirmationModal, { ConfirmationModalContent, TransactionErrorContent, TransactionSubmittedContent } from 'components/TransactionConfirmationModal'
import { maxAmountSpend } from 'utils/maxAmountSpend'
import { isAddress } from 'utils'
import { Contract } from '@ethersproject/contracts'

const WarningBox = styled(LightCard)`
  background-color: ${({ theme }) => theme.colors.warning};
  border: 1px solid ${({ theme }) => theme.colors.warning};
  padding: 16px;
  margin-top: 20px;
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  margin: 16px 0;
`

const StyledCheckbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`

const CheckboxGroup = styled.div`
  border: 2px dashed ${({ theme }) => theme.colors.borderColor};
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  background-color: ${({ theme }) => theme.colors.backgroundAlt || theme.colors.background};
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.tertiary || theme.colors.backgroundAlt};
  }
`

export default function CreateLock() {
  const { t } = useTranslation()
  const { account, chainId } = useActiveWeb3React()
  const addTransaction = useTransactionAdder()

  // Token address input (can be token or LP token)
  const [tokenAddress, setTokenAddress] = useState('')
  const [useAnotherOwner, setUseAnotherOwner] = useState(false)
  const [ownerAddress, setOwnerAddress] = useState('')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [useVesting, setUseVesting] = useState(false)
  const [unlockDate, setUnlockDate] = useState('')
  const [tgeDate, setTgeDate] = useState('')
  const [tgePercent, setTgePercent] = useState('')
  const [cycleDays, setCycleDays] = useState('')
  const [cyclePercent, setCyclePercent] = useState('')

  // Calculate actual owner address
  const actualOwner = useMemo(() => {
    if (useAnotherOwner && ownerAddress && isAddress(ownerAddress)) {
      return ownerAddress
    }
    return account ?? undefined
  }, [useAnotherOwner, ownerAddress, account])

  // Get currency from address
  const currency = useCurrency(isAddress(tokenAddress) ? tokenAddress : undefined)
  const token = currency instanceof Token ? currency : undefined
  const { library } = useActiveWeb3React()
  const [isLpToken, setIsLpToken] = useState(false)

  // Detect if token is an LP token by checking if it has factory() method
  useEffect(() => {
    const checkIsLpToken = async () => {
      if (!tokenAddress || !isAddress(tokenAddress) || !library) {
        setIsLpToken(false)
        return
      }

      try {
        // Try to call factory() method on the token address
        // LP tokens (UniswapV2Pair) have a factory() method
        const PAIR_ABI = ['function factory() external view returns (address)']
        const contract = new Contract(tokenAddress, PAIR_ABI, library)
        const factory = await contract.factory()
        // If factory() returns a non-zero address, it's likely an LP token
        setIsLpToken(factory && factory !== '0x0000000000000000000000000000000000000000')
      } catch (err) {
        // If factory() call fails, it's not an LP token
        setIsLpToken(false)
      }
    }

    checkIsLpToken()
  }, [tokenAddress, library])

  const userBalance = useTokenBalance(account ?? undefined, token)
  const lockContract = useLockContract(true)

  // Calculate parsed amount
  const parsedAmount = useMemo(() => {
    if (!currency || !amount) return undefined
    try {
      return parseUnits(amount, currency.decimals)
    } catch {
      return undefined
    }
  }, [currency, amount])

  const maxAmount = useMemo(() => maxAmountSpend(userBalance), [userBalance])

  const amountToApprove = useMemo(() => {
    if (!parsedAmount || !token) return undefined
    try {
      return new TokenAmount(token, parsedAmount.toString())
    } catch {
      return undefined
    }
  }, [parsedAmount, token])

  const [approvalState, approveCallback] = useApproveCallback(amountToApprove, lockContract?.address)
  const pendingApproval = useHasPendingApproval(token?.address, lockContract?.address)

  const [attemptingTxn, setAttemptingTxn] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>(undefined)
  const [lockErrorMessage, setLockErrorMessage] = useState<string | undefined>(undefined)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  const handleMax = useCallback(() => {
    if (maxAmount) {
      setAmount(maxAmount.toExact())
    }
  }, [maxAmount])

  const handleApprove = useCallback(async () => {
    if (isApproving || approvalState !== ApprovalState.NOT_APPROVED) {
      return
    }
    setIsApproving(true)
    try {
      await approveCallback()
      // Keep isApproving true until transaction is confirmed
      // The approvalState will change when transaction is confirmed
    } catch (error) {
      console.error('Approval failed:', error)
      setIsApproving(false)
    }
  }, [isApproving, approvalState, approveCallback])

  // Reset isApproving when approval is confirmed
  useEffect(() => {
    if (approvalState === ApprovalState.APPROVED && isApproving) {
      setIsApproving(false)
    }
  }, [approvalState, isApproving])

  const isValid = useMemo(() => {
    if (!account) return false
    if (!tokenAddress || !isAddress(tokenAddress)) return false
    if (!currency || !token) return false
    if (!amount || parseFloat(amount) <= 0) return false
    if (userBalance && amountToApprove && amountToApprove.greaterThan(userBalance)) return false

    // Owner address validation
    if (useAnotherOwner) {
      if (!ownerAddress || !isAddress(ownerAddress)) return false
    }

    if (useVesting) {
      // Vesting lock validation
      if (!tgeDate) return false
      const tgeTimestamp = Math.floor(new Date(tgeDate).getTime() / 1000)
      if (tgeTimestamp <= Math.floor(Date.now() / 1000)) return false
      if (!tgePercent || parseFloat(tgePercent) < 0 || parseFloat(tgePercent) > 100) return false
      if (!cycleDays || parseFloat(cycleDays) <= 0) return false
      if (!cyclePercent || parseFloat(cyclePercent) < 0 || parseFloat(cyclePercent) > 100) return false
      // TGE + cycle percent should not exceed 100%
      if (parseFloat(tgePercent) + parseFloat(cyclePercent) > 100) return false
    } else {
      // Normal lock validation
      if (!unlockDate) return false
      const unlockTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000)
      if (unlockTimestamp <= Math.floor(Date.now() / 1000)) return false
    }

    return true
  }, [
    account,
    tokenAddress,
    currency,
    token,
    amount,
    userBalance,
    amountToApprove,
    useAnotherOwner,
    ownerAddress,
    useVesting,
    unlockDate,
    tgeDate,
    tgePercent,
    cycleDays,
    cyclePercent,
  ])

  const handleCreateLock = useCallback(async () => {
    if (!lockContract || !account || !currency || !token || !parsedAmount || !isValid || !actualOwner) {
      return
    }

    setAttemptingTxn(true)
    setLockErrorMessage(undefined)
    setTxHash(undefined)

    try {
      if (useVesting) {
        // Vesting lock
        const tgeTimestamp = Math.floor(new Date(tgeDate).getTime() / 1000)
        const tgeBps = Math.floor(parseFloat(tgePercent) * 100) // Convert to basis points
        const cycleSeconds = Math.floor(parseFloat(cycleDays) * 24 * 60 * 60)
        const cycleBps = Math.floor(parseFloat(cyclePercent) * 100) // Convert to basis points

        const tx: TransactionResponse = await lockContract.vestingLock(
          actualOwner,
          token.address,
          isLpToken,
          parsedAmount,
          tgeTimestamp,
          tgeBps,
          cycleSeconds,
          cycleBps,
          title || ''
        )

        addTransaction(tx, {
          summary: `${t('createLock')} ${amount} ${currency.symbol} (Vesting)`,
        })

        setTxHash(tx.hash)
        await tx.wait()
      } else {
        // Normal lock
        const unlockTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000)

        const tx: TransactionResponse = await lockContract.lock(
          actualOwner,
          token.address,
          isLpToken,
          parsedAmount,
          unlockTimestamp,
          title || ''
        )

        addTransaction(tx, {
          summary: `${t('createLock')} ${amount} ${currency.symbol}`,
        })

        setTxHash(tx.hash)
        await tx.wait()
      }

      setAttemptingTxn(false)

      // Reset form
      setTokenAddress('')
      setUseAnotherOwner(false)
      setOwnerAddress('')
      setTitle('')
      setAmount('')
      setUseVesting(false)
      setUnlockDate('')
      setTgeDate('')
      setTgePercent('')
      setCycleDays('')
      setCyclePercent('')
      setShowConfirm(false)
    } catch (error: any) {
      console.error('Failed to create lock:', error)
      setAttemptingTxn(false)
      setLockErrorMessage(error?.message || t('lockFailed') || 'Failed to create lock')
      setTxHash(undefined)
    }
  }, [
    lockContract,
    account,
    currency,
    token,
    isValid,
    amount,
    useVesting,
    unlockDate,
    tgeDate,
    tgePercent,
    cycleDays,
    cyclePercent,
    isLpToken,
    title,
    addTransaction,
    t,
    parsedAmount,
    actualOwner,
  ])

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    setTxHash(undefined)
  }, [])

  const modalHeader = useCallback(() => {
    return (
      <AutoColumn gap="6px" justify="center">
        <Text fontSize="20px" textAlign="center">
          {t('createLock')}
        </Text>
        <Text fontSize="14px" textAlign="center" color="textSubtle">
          {currency ? `您确认要创建该代币(${currency.symbol})的锁仓？` : t('confirm')}
        </Text>
      </AutoColumn>
    )
  }, [t, currency])

  const modalBottom = useCallback(() => {
    return (
      <AutoColumn gap="6px">
        <Button
          variant="primary"
          onClick={handleCreateLock}
          disabled={!isValid || attemptingTxn || approvalState === ApprovalState.PENDING}
          width="100%"
        >
          {attemptingTxn ? <Text>待锁仓</Text> : t('confirm')}
        </Button>
      </AutoColumn>
    )
  }, [handleCreateLock, isValid, attemptingTxn, approvalState, t])

  const renderConfirmationContent = useCallback(
    () => (
      <ConfirmationModalContent
        title={t('createLock')}
        onDismiss={handleDismissConfirmation}
        topContent={modalHeader}
        bottomContent={modalBottom}
      />
    ),
    [t, handleDismissConfirmation, modalHeader, modalBottom]
  )

  return (
    <CardBody>
      <AutoColumn gap="10px">
        {/* Token or LP Token Address */}
        <AutoColumn gap="10px">
          <Text fontSize="14px" color="textSubtle" mb="8px">
            {t('tokenOrLpTokenAddress')}
          </Text>
          <UIKitInput
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            style={{
              fontFamily: 'monospace',
            }}
          />
          {tokenAddress && !isAddress(tokenAddress) && (
            <Text fontSize="12px" color="failure">
              {t('invalidTokenAddress')}
            </Text>
          )}
        </AutoColumn>

        {/* Use Another Owner Checkbox */}
        <CheckboxGroup>
          <CheckboxLabel>
            <StyledCheckbox
              type="checkbox"
              checked={useAnotherOwner}
              onChange={(e) => {
                setUseAnotherOwner(e.target.checked)
                if (!e.target.checked) {
                  setOwnerAddress('')
                }
              }}
            />
            <Text fontWeight="600">{t('useAnotherOwner')}</Text>
          </CheckboxLabel>

          {/* Owner Address Input */}
          {useAnotherOwner && (
            <AutoColumn gap="10px" style={{ marginTop: '12px' }}>
              <Text fontSize="14px" color="textSubtle" mb="8px">
                {t('enterOwnerAddress')}
              </Text>
              <UIKitInput
                value={ownerAddress}
                onChange={(e) => setOwnerAddress(e.target.value)}
                style={{
                  fontFamily: 'monospace',
                }}
              />
              {ownerAddress && !isAddress(ownerAddress) && (
                <Text fontSize="12px" color="failure">
                  {t('invalidOwnerAddress')}
                </Text>
              )}
              <Text fontSize="12px" color="primary" mt="4px">
                {t('ownerAddressNote')}
              </Text>
            </AutoColumn>
          )}
        </CheckboxGroup>

        {/* Title (optional) */}
        <AutoColumn gap="10px">
          <Text fontSize="14px" color="textSubtle" mb="8px">
            {t('lockTitle')} ({t('optional')})
          </Text>
          <UIKitInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </AutoColumn>

        {/* Amount */}
        {token && (
          <AutoColumn gap="10px">
            <Text fontSize="14px" color="textSubtle" mb="8px">
              {t('amount')}
            </Text>
            <CurrencyInputPanel
              value={amount}
              onUserInput={setAmount}
              onMax={handleMax}
              currency={currency}
              disableCurrencySelect
              showMaxButton
              id="lock-amount-input"
            />
          </AutoColumn>
        )}

        {/* Use Vesting Checkbox */}
        <CheckboxGroup>
          <CheckboxLabel>
            <StyledCheckbox
              type="checkbox"
              checked={useVesting}
              onChange={(e) => setUseVesting(e.target.checked)}
            />
            <Text fontWeight="600">{t('useVesting')}</Text>
          </CheckboxLabel>

          {/* Vesting Fields - Show when using vesting */}
          {useVesting && (
            <AutoColumn gap="12px" style={{ marginTop: '12px' }}>
              <AutoColumn gap="10px">
                <Text fontSize="14px" color="textSubtle" mb="8px">
                  {t('tgeDateUtc')}
                </Text>
                <UIKitInput
                  type="datetime-local"
                  value={tgeDate}
                  onChange={(e) => setTgeDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '16px',
                  }}
                />
              </AutoColumn>

              <AutoColumn gap="10px">
                <Text fontSize="14px" color="textSubtle" mb="8px">
                  {t('tgePercentDesc')} (%)
                </Text>
                <UIKitInput
                  type="number"
                  value={tgePercent}
                  onChange={(e) => setTgePercent(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="100"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '16px',
                  }}
                />
              </AutoColumn>

              <AutoColumn gap="10px">
                <Text fontSize="14px" color="textSubtle" mb="8px">
                  {t('cycleDaysDesc')}
                </Text>
                <UIKitInput
                  type="number"
                  value={cycleDays}
                  onChange={(e) => setCycleDays(e.target.value)}
                  placeholder="0"
                  min="1"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '16px',
                  }}
                />
              </AutoColumn>

              <AutoColumn gap="10px">
                <Text fontSize="14px" color="textSubtle" mb="8px">
                  {t('cycleReleasePercent')} (%)
                </Text>
                <UIKitInput
                  type="number"
                  value={cyclePercent}
                  onChange={(e) => setCyclePercent(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="100"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '16px',
                  }}
                />
              </AutoColumn>
            </AutoColumn>
          )}
        </CheckboxGroup>

        {/* Unlock Date - Show when NOT using vesting */}
        {!useVesting && (
          <AutoColumn gap="10px">
            <Text fontSize="14px" color="textSubtle" mb="8px">
              {t('unlockDate')}
            </Text>
            <UIKitInput
              type="datetime-local"
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '16px',
              }}
            />
          </AutoColumn>
        )}

        {/* Warning Box */}
        <WarningBox>
          <Text fontSize="12px" color="text">
            {t('lockWarning')}
          </Text>
        </WarningBox>

        {/* Action Buttons */}
        {!account ? (
          <LightCard padding="40px">
            <Text color="textDisabled" textAlign="center">
              {t('connectWallet')}
            </Text>
          </LightCard>
        ) : approvalState === ApprovalState.NOT_APPROVED || approvalState === ApprovalState.PENDING || isApproving || pendingApproval ? (
          <Button
            id="approve-token-button"
            onClick={handleApprove}
            disabled={approvalState === ApprovalState.PENDING || isApproving || pendingApproval || !isValid}
            width="100%"
          >
            {approvalState === ApprovalState.PENDING || isApproving || pendingApproval ? (
              <Text>授权中...</Text>
            ) : (
              t('approveToken')
            )}
          </Button>
        ) : (
          <Button
            id="create-lock-button"
            onClick={() => setShowConfirm(true)}
            disabled={!isValid || attemptingTxn}
            width="100%"
          >
            {t('createLock')}
          </Button>
        )}
      </AutoColumn>

      <TransactionConfirmationModal
        isOpen={showConfirm}
        onDismiss={handleDismissConfirmation}
        attemptingTxn={attemptingTxn}
        hash={txHash}
        content={() => {
          if (lockErrorMessage) {
            return <TransactionErrorContent message={lockErrorMessage} onDismiss={handleDismissConfirmation} />
          }
          if (txHash && !attemptingTxn && chainId) {
            return <TransactionSubmittedContent chainId={chainId} hash={txHash} onDismiss={handleDismissConfirmation} />
          }
          return renderConfirmationContent()
        }}
        pendingText="待锁仓"
      />
    </CardBody>
  )
}

