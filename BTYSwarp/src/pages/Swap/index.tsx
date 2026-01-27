import { Currency, CurrencyAmount, ETHER, JSBI, Token, Trade, WETH, currencyEquals } from '@btyswap-libs/sdk'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowDown } from 'react-feather'
import { CardBody, ArrowDownIcon, Button, IconButton, Text } from '@pancakeswap-libs/uikit'
import { ThemeContext } from 'styled-components'
import AddressInputPanel from 'components/AddressInputPanel'
import Card, { GreyCard } from 'components/Card'
import { AutoColumn } from 'components/Column'
import ConfirmSwapModal from 'components/swap/ConfirmSwapModal'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import TransactionConfirmationModal, { ConfirmationModalContent, TransactionErrorContent } from 'components/TransactionConfirmationModal'
import { AutoRow, RowBetween } from 'components/Row'
import AdvancedSwapDetailsDropdown from 'components/swap/AdvancedSwapDetailsDropdown'
import confirmPriceImpactWithoutFee from 'components/swap/confirmPriceImpactWithoutFee'
import { ArrowWrapper, BottomGrouping, SwapCallbackError, Wrapper } from 'components/swap/styleds'
import TradePrice from 'components/swap/TradePrice'
import TokenWarningModal from 'components/TokenWarningModal'
import SyrupWarningModal from 'components/SyrupWarningModal'
import SafeMoonWarningModal from 'components/SafeMoonWarningModal'
import ProgressSteps from 'components/ProgressSteps'
import Container from 'components/Container'

import { INITIAL_ALLOWED_SLIPPAGE, ROUTER_ADDRESS } from 'constants/index'
import { useActiveWeb3React } from 'hooks'
import useTokenSymbol from 'hooks/useTokenSymbol'
import { useCurrency } from 'hooks/Tokens'
import { ApprovalState, useApproveCallbackFromTrade } from 'hooks/useApproveCallback'
import { useHasPendingApproval } from 'state/transactions/hooks'
import { useSwapCallback } from 'hooks/useSwapCallback'
import useWrapCallback, { WrapType } from 'hooks/useWrapCallback'
import { Field } from 'state/swap/actions'
import { useDefaultsFromURLSearch, useDerivedSwapInfo, useSwapActionHandlers, useSwapState } from 'state/swap/hooks'
import { useExpertModeManager, useUserDeadline, useUserSlippageTolerance } from 'state/user/hooks'
import { LinkStyledButton } from 'components/Shared'
import { maxAmountSpend } from 'utils/maxAmountSpend'
import { computeTradePriceBreakdown, warningSeverity } from 'utils/prices'
import Loader from 'components/Loader'
import { useTranslation } from 'react-i18next'
import PageHeader from 'components/PageHeader'
import AppBody from '../AppBody'

const Swap = () => {
  const loadedUrlParams = useDefaultsFromURLSearch()
  const { t } = useTranslation()
  const { chainId } = useActiveWeb3React()
  const { getTokenSymbol } = useTokenSymbol()

  // token warning stuff
  const [loadedInputCurrency, loadedOutputCurrency] = [
    useCurrency(loadedUrlParams?.inputCurrencyId),
    useCurrency(loadedUrlParams?.outputCurrencyId),
  ]
  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
  const [transactionWarning, setTransactionWarning] = useState<{
    selectedToken: string | null
    purchaseType: string | null
  }>({
    selectedToken: null,
    purchaseType: null,
  })
  const urlLoadedTokens: Token[] = useMemo(
    () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c instanceof Token) ?? [],
    [loadedInputCurrency, loadedOutputCurrency]
  )
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  const handleConfirmWarning = () => {
    setTransactionWarning({
      selectedToken: null,
      purchaseType: null,
    })
  }
  const theme = useContext(ThemeContext)

  const [isExpertMode] = useExpertModeManager()

  // get custom setting values for user
  const [deadline] = useUserDeadline()
  const [allowedSlippage] = useUserSlippageTolerance()

  // swap state
  const { independentField, typedValue, recipient } = useSwapState()
  const { v2Trade, currencyBalances, parsedAmount, currencies, inputError: swapInputError } = useDerivedSwapInfo()
  const { wrapType, execute: wrapExecute, inputError: wrapInputError } = useWrapCallback(
    currencies[Field.INPUT],
    currencies[Field.OUTPUT],
    typedValue
  )

  // Wrap/Unwrap state
  const [showWrapConfirm, setShowWrapConfirm] = useState(false)
  const [wrapAttemptingTxn, setWrapAttemptingTxn] = useState(false)
  const [wrapTxHash, setWrapTxHash] = useState<string | undefined>(undefined)
  const [wrapErrorMessage, setWrapErrorMessage] = useState<string | undefined>(undefined)

  const handleWrapClick = useCallback(() => {
    setShowWrapConfirm(true)
    setWrapErrorMessage(undefined)
  }, [])

  const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE
  const trade = showWrap ? undefined : v2Trade

  const parsedAmounts = showWrap
    ? {
      [Field.INPUT]: parsedAmount,
      [Field.OUTPUT]: parsedAmount,
    }
    : {
      [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
      [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount,
    }

  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()
  const isValid = !swapInputError
  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  // 动态过滤输出货币：根据输入货币类型限制输出货币选择
  const outputCurrencyFilter = useMemo(() => {
    if (!chainId) return undefined

    const inputCurrency = currencies[Field.INPUT]
    if (!inputCurrency) return undefined

    const inputIsBTY = inputCurrency === ETHER
    const inputIsWBTY = inputCurrency && WETH[chainId] && currencyEquals(inputCurrency, WETH[chainId])
    const inputIsOtherERC20 = !inputIsBTY && !inputIsWBTY

    return (currency: Currency): boolean => {
      const currencyIsBTY = currency === ETHER
      const currencyIsWBTY = currency && WETH[chainId] && currencyEquals(currency, WETH[chainId])
      const currencyIsOtherERC20 = !currencyIsBTY && !currencyIsWBTY

      // 情况 A：输入是 BTY，只能选 WBTY
      if (inputIsBTY) {
        return currencyIsWBTY
      }

      // 情况 B：输入是 WBTY，可以选 BTY 或其他 ERC20
      if (inputIsWBTY) {
        return currencyIsBTY || currencyIsOtherERC20
      }

      // 情况 C：输入是其他 ERC20，只能选 WBTY 或其他 ERC20（不能选 BTY）
      if (inputIsOtherERC20) {
        return currencyIsWBTY || currencyIsOtherERC20
      }

      return true
    }
  }, [chainId, currencies])

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },
    [onUserInput]
  )
  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value)
    },
    [onUserInput]
  )

  // modal and loading
  const [{ showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
    showConfirm: boolean
    tradeToConfirm: Trade | undefined
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined,
  })

  const handleWrap = useCallback(async () => {
    if (!wrapExecute) return
    
    setWrapAttemptingTxn(true)
    setWrapErrorMessage(undefined)
    setWrapTxHash(undefined)

    try {
      const hash = await wrapExecute()
      setWrapTxHash(hash)
    } catch (err: any) {
      console.error('Wrap/Unwrap failed:', err)
      setWrapErrorMessage(err?.message || 'Transaction failed')
      setWrapTxHash(undefined)
    } finally {
      setWrapAttemptingTxn(false)
    }
  }, [wrapExecute])

  const handleWrapConfirmDismiss = useCallback(() => {
    setShowWrapConfirm(false)
    if (wrapTxHash) {
      setWrapTxHash(undefined)
    }
  }, [wrapTxHash])

  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: showWrap
      ? parsedAmounts[independentField]?.toExact() ?? ''
      : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
  }

  const route = trade?.route
  const userHasSpecifiedInputOutput = Boolean(
    currencies[Field.INPUT] && currencies[Field.OUTPUT] && parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0))
  )
  const noRoute = !route

  // check whether the user has approved the router on the input token
  const [approval, approveCallback] = useApproveCallbackFromTrade(trade, allowedSlippage)
  
  // Track pending approvals
  const inputCurrency = currencies[Field.INPUT]
  const inputToken: Token | undefined = inputCurrency instanceof Token ? inputCurrency : undefined
  const pendingApproval = useHasPendingApproval(inputToken?.address, ROUTER_ADDRESS)
  
  // Track if approval is in progress (from click to transaction submission)
  const [isApproving, setIsApproving] = useState(false)

  // Reset isApproving when approval is confirmed
  useEffect(() => {
    if (approval === ApprovalState.APPROVED && isApproving) {
      setIsApproving(false)
    }
  }, [approval, isApproving])

  // check if user has gone through approval process, used to show two step buttons, reset on token change
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)

  // mark when a user has submitted an approval, reset onTokenSelection for input field
  useEffect(() => {
    if (approval === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [approval, approvalSubmitted])
  
  // Wrapper function for approve callback to manage isApproving state
  const handleApprove = useCallback(async () => {
    if (isApproving || approval !== ApprovalState.NOT_APPROVED) {
      return
    }
    
    setIsApproving(true)
    
    try {
      await approveCallback()
      // Keep isApproving true until transaction is confirmed
    } catch (err) {
      console.error('Approval failed:', err)
      setIsApproving(false)
    }
  }, [isApproving, approval, approveCallback])

  const maxAmountInput: CurrencyAmount | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
  const atMaxAmountInput = Boolean(maxAmountInput && parsedAmounts[Field.INPUT]?.equalTo(maxAmountInput))

  // the callback to execute the swap
  const { callback: swapCallback, error: swapCallbackError } = useSwapCallback(
    trade,
    allowedSlippage,
    deadline,
    recipient
  )

  const { priceImpactWithoutFee } = computeTradePriceBreakdown(trade)

  const handleSwap = useCallback(() => {
    if (priceImpactWithoutFee && !confirmPriceImpactWithoutFee(priceImpactWithoutFee)) {
      return
    }
    if (!swapCallback) {
      return
    }
    setSwapState((prevState) => ({ ...prevState, attemptingTxn: true, swapErrorMessage: undefined, txHash: undefined }))
    swapCallback()
      .then((hash) => {
        setSwapState((prevState) => ({
          ...prevState,
          attemptingTxn: false,
          swapErrorMessage: undefined,
          txHash: hash,
        }))
      })
      .catch((error) => {
        setSwapState((prevState) => ({
          ...prevState,
          attemptingTxn: false,
          swapErrorMessage: error.message,
          txHash: undefined,
        }))
      })
  }, [priceImpactWithoutFee, swapCallback, setSwapState])

  // errors
  const [showInverted, setShowInverted] = useState<boolean>(false)

  // warnings on slippage
  const priceImpactSeverity = warningSeverity(priceImpactWithoutFee)

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !swapInputError &&
    (approval === ApprovalState.NOT_APPROVED ||
      approval === ApprovalState.PENDING ||
      (approvalSubmitted && approval === ApprovalState.APPROVED)) &&
    !(priceImpactSeverity > 3 && !isExpertMode)

  const handleConfirmDismiss = useCallback(() => {
    setSwapState((prevState) => ({ ...prevState, showConfirm: false }))

    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Field.INPUT, '')
    }
  }, [onUserInput, txHash, setSwapState])

  const handleAcceptChanges = useCallback(() => {
    setSwapState((prevState) => ({ ...prevState, tradeToConfirm: trade }))
  }, [trade])

  // This will check to see if the user has selected Syrup or SafeMoon to either buy or sell.
  // If so, they will be alerted with a warning message.
  const checkForWarning = useCallback(
    (selected: string, purchaseType: string) => {
      if (['SYRUP', 'SAFEMOON'].includes(selected)) {
        setTransactionWarning({
          selectedToken: selected,
          purchaseType,
        })
      }
    },
    [setTransactionWarning]
  )

  const handleInputSelect = useCallback(
    (currency) => {
      setApprovalSubmitted(false) // reset 2 step UI for approvals
      onCurrencySelection(Field.INPUT, currency)
      if (currency.symbol === 'SYRUP') {
        checkForWarning(currency.symbol, 'Selling')
      }
      if (currency.symbol === 'SAFEMOON') {
        checkForWarning(currency.symbol, 'Selling')
      }
    },
    [onCurrencySelection, setApprovalSubmitted, checkForWarning]
  )

  const handleMaxInput = useCallback(() => {
    if (maxAmountInput) {
      onUserInput(Field.INPUT, maxAmountInput.toExact())
    }
  }, [maxAmountInput, onUserInput])

  const handleOutputSelect = useCallback(
    (outputCurrency) => {
      onCurrencySelection(Field.OUTPUT, outputCurrency)
      if (outputCurrency.symbol === 'SYRUP') {
        checkForWarning(outputCurrency.symbol, 'Buying')
      }
      if (outputCurrency.symbol === 'SAFEMOON') {
        checkForWarning(outputCurrency.symbol, 'Buying')
      }
    },
    [onCurrencySelection, checkForWarning]
  )

  return (
    <Container>
      <TokenWarningModal
        isOpen={urlLoadedTokens.length > 0 && !dismissTokenWarning}
        tokens={urlLoadedTokens}
        onConfirm={handleConfirmTokenWarning}
      />
      <SyrupWarningModal
        isOpen={transactionWarning.selectedToken === 'SYRUP'}
        transactionType={transactionWarning.purchaseType}
        onConfirm={handleConfirmWarning}
      />
      <SafeMoonWarningModal isOpen={transactionWarning.selectedToken === 'SAFEMOON'} onConfirm={handleConfirmWarning} />
      <AppBody>
        <Wrapper id="swap-page">
          <TransactionConfirmationModal
            isOpen={showWrapConfirm}
            onDismiss={handleWrapConfirmDismiss}
            attemptingTxn={wrapAttemptingTxn}
            hash={wrapTxHash}
            content={() => {
              if (wrapErrorMessage) {
                return <TransactionErrorContent message={wrapErrorMessage} onDismiss={handleWrapConfirmDismiss} />
              }
              return (
                <ConfirmationModalContent
                  title={wrapType === WrapType.WRAP ? 'Wrap' : 'Unwrap'}
                  onDismiss={handleWrapConfirmDismiss}
                  topContent={() => (
                    <AutoColumn gap="md">
                      <Text fontSize="16px" textAlign="center">
                        {wrapType === WrapType.WRAP 
                          ? `Wrap ${parsedAmounts[Field.INPUT]?.toSignificant(6)} ${currencies[Field.INPUT]?.symbol} to ${currencies[Field.OUTPUT]?.symbol}`
                          : `Unwrap ${parsedAmounts[Field.INPUT]?.toSignificant(6)} ${currencies[Field.INPUT]?.symbol} to ${currencies[Field.OUTPUT]?.symbol}`}
                      </Text>
                    </AutoColumn>
                  )}
                  bottomContent={() => (
                    <Button
                      variant="primary"
                      onClick={handleWrap}
                      disabled={wrapAttemptingTxn || Boolean(wrapInputError)}
                      width="100%"
                    >
                      {wrapAttemptingTxn ? 'Processing...' : (wrapType === WrapType.WRAP ? 'Wrap' : 'Unwrap')}
                    </Button>
                  )}
                />
              )
            }}
            pendingText={wrapType === WrapType.WRAP 
              ? `Wrapping ${parsedAmounts[Field.INPUT]?.toSignificant(6)} ${currencies[Field.INPUT]?.symbol}`
              : `Unwrapping ${parsedAmounts[Field.INPUT]?.toSignificant(6)} ${currencies[Field.INPUT]?.symbol}`}
          />
          <ConfirmSwapModal
            isOpen={showConfirm}
            trade={trade}
            originalTrade={tradeToConfirm}
            onAcceptChanges={handleAcceptChanges}
            attemptingTxn={attemptingTxn}
            txHash={txHash}
            recipient={recipient}
            allowedSlippage={allowedSlippage}
            onConfirm={handleSwap}
            swapErrorMessage={swapErrorMessage}
            onDismiss={handleConfirmDismiss}
          />
          <PageHeader title={t('exchange')} description={t('tradeTokensInstant')} />
          <CardBody>
            <AutoColumn gap="md">
              <CurrencyInputPanel
                label={
                  independentField === Field.OUTPUT && !showWrap && trade
                    ? t('fromEstimated')
                    : t('from')
                }
                value={formattedAmounts[Field.INPUT]}
                showMaxButton={!atMaxAmountInput}
                currency={currencies[Field.INPUT]}
                onUserInput={handleTypeInput}
                onMax={handleMaxInput}
                onCurrencySelect={handleInputSelect}
                otherCurrency={currencies[Field.OUTPUT]}
                id="swap-currency-input"
              />
              <AutoColumn justify="space-between">
                <AutoRow justify={isExpertMode ? 'space-between' : 'center'} style={{ padding: '0 1rem' }}>
                  <ArrowWrapper clickable>
                    <IconButton
                      variant="tertiary"
                      onClick={() => {
                        setApprovalSubmitted(false) // reset 2 step UI for approvals
                        onSwitchTokens()
                      }}
                      style={{ borderRadius: '50%' }}
                      scale="sm"
                    >
                      <ArrowDownIcon color="primary" width="24px" />
                    </IconButton>
                  </ArrowWrapper>
                  {recipient === null && !showWrap && isExpertMode ? (
                    <LinkStyledButton id="add-recipient-button" onClick={() => onChangeRecipient('')}>
                      + Add a send (optional)
                    </LinkStyledButton>
                  ) : null}
                </AutoRow>
              </AutoColumn>
              <CurrencyInputPanel
                value={formattedAmounts[Field.OUTPUT]}
                onUserInput={handleTypeOutput}
                label={
                  independentField === Field.INPUT && !showWrap && trade
                    ? t('toEstimated')
                    : t('to')
                }
                showMaxButton={false}
                currency={currencies[Field.OUTPUT]}
                onCurrencySelect={handleOutputSelect}
                otherCurrency={currencies[Field.INPUT]}
                id="swap-currency-output"
                currencyFilter={outputCurrencyFilter}
              />

              {recipient !== null && !showWrap ? (
                <>
                  <AutoRow justify="space-between" style={{ padding: '0 1rem' }}>
                    <ArrowWrapper clickable={false}>
                      <ArrowDown size="16" color={theme.colors.textSubtle} />
                    </ArrowWrapper>
                    <LinkStyledButton id="remove-recipient-button" onClick={() => onChangeRecipient(null)}>
                      - Remove send
                    </LinkStyledButton>
                  </AutoRow>
                  <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient} />
                </>
              ) : null}

              {showWrap ? null : (
                <Card padding=".25rem .75rem 0 .75rem" borderRadius="20px">
                  <AutoColumn gap="4px">
                    {Boolean(trade) && (
                      <RowBetween align="center">
                        <Text fontSize="14px">{t('price')}</Text>
                        <TradePrice
                          price={trade?.executionPrice}
                          showInverted={showInverted}
                          setShowInverted={setShowInverted}
                        />
                      </RowBetween>
                    )}
                    {allowedSlippage !== INITIAL_ALLOWED_SLIPPAGE && (
                      <RowBetween align="center">
                        <Text fontSize="14px">{t('slippageTolerance')}</Text>
                        <Text fontSize="14px">{allowedSlippage / 100}%</Text>
                      </RowBetween>
                    )}
                  </AutoColumn>
                </Card>
              )}
            </AutoColumn>
            <BottomGrouping>
              {showWrap ? (
                <Button disabled={Boolean(wrapInputError)} onClick={handleWrapClick} width="100%">
                  {wrapInputError ??
                    (wrapType === WrapType.WRAP ? 'Wrap' : wrapType === WrapType.UNWRAP ? 'Unwrap' : null)}
                </Button>
              ) : noRoute && userHasSpecifiedInputOutput ? (
                <GreyCard style={{ textAlign: 'center' }}>
                  <Text mb="4px">{t('insufficientLiquidityTrade')}</Text>
                </GreyCard>
              ) : showApproveFlow ? (
                <RowBetween>
                  <Button
                    onClick={handleApprove}
                    disabled={approval !== ApprovalState.NOT_APPROVED || approvalSubmitted || isApproving || pendingApproval}
                    style={{ width: '48%' }}
                    variant={approval === ApprovalState.APPROVED ? 'success' : 'primary'}
                  >
                    {approval === ApprovalState.PENDING || isApproving || pendingApproval ? (
                      <AutoRow gap="6px" justify="center">
                        授权中... <Loader stroke="white" />
                      </AutoRow>
                    ) : approvalSubmitted && approval === ApprovalState.APPROVED ? (
                      'Approved'
                    ) : (
                      `Approve ${getTokenSymbol(currencies[Field.INPUT], chainId)}`
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      if (isExpertMode) {
                        handleSwap()
                      } else {
                        setSwapState({
                          tradeToConfirm: trade,
                          attemptingTxn: false,
                          swapErrorMessage: undefined,
                          showConfirm: true,
                          txHash: undefined,
                        })
                      }
                    }}
                    style={{ width: '48%' }}
                    id="swap-button"
                    disabled={
                      !isValid ||
                      approval !== ApprovalState.APPROVED ||
                      (priceImpactSeverity > 3 && !isExpertMode)
                    }
                    variant={isValid && priceImpactSeverity > 2 ? 'danger' : 'primary'}
                  >
                    {priceImpactSeverity > 3 && !isExpertMode
                      ? `Price Impact High`
                      : `Swap${priceImpactSeverity > 2 ? ' Anyway' : ''}`}
                  </Button>
                </RowBetween>
              ) : (
                <Button
                  onClick={() => {
                    if (isExpertMode) {
                      handleSwap()
                    } else {
                      setSwapState({
                        tradeToConfirm: trade,
                        attemptingTxn: false,
                        swapErrorMessage: undefined,
                        showConfirm: true,
                        txHash: undefined,
                      })
                    }
                  }}
                  id="swap-button"
                  disabled={
                    !isValid ||
                    (priceImpactSeverity > 3 && !isExpertMode) ||
                    !!swapCallbackError
                  }
                  variant={isValid && priceImpactSeverity > 2 && !swapCallbackError ? 'danger' : 'primary'}
                  width="100%"
                >
                  {swapInputError ||
                    (priceImpactSeverity > 3 && !isExpertMode
                      ? `Price Impact Too High`
                      : `Swap${priceImpactSeverity > 2 ? ' Anyway' : ''}`)}
                </Button>
              )}
              {showApproveFlow && <ProgressSteps steps={[approval === ApprovalState.APPROVED]} />}
              {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
            </BottomGrouping>
          </CardBody>
        </Wrapper>
      </AppBody>
      <AdvancedSwapDetailsDropdown trade={trade} />
    </Container>
  )
}

export default Swap
