import { ChainId, Currency, currencyEquals, ETHER, WETH, Token } from '@btyswap-libs/sdk'
import { useMemo } from 'react'
import { tryParseAmount } from '../state/swap/hooks'
import { useTransactionAdder } from '../state/transactions/hooks'
import { useCurrencyBalance } from '../state/wallet/hooks'
import { useActiveWeb3React } from './index'
import { useWETHContract } from './useContract'

export enum WrapType {
  NOT_APPLICABLE,
  WRAP,
  UNWRAP
}

const NOT_APPLICABLE = { wrapType: WrapType.NOT_APPLICABLE }
/**
 * Given the selected input and output currency, return a wrap callback
 * @param inputCurrency the selected input currency
 * @param outputCurrency the selected output currency
 * @param typedValue the user input value
 */
export default function useWrapCallback(
  inputCurrency: Currency | undefined,
  outputCurrency: Currency | undefined,
  typedValue: string | undefined
): { wrapType: WrapType; execute?: undefined | (() => Promise<string>); inputError?: string } {
  const { chainId, account } = useActiveWeb3React()
  const wethContract = useWETHContract()
  const balance = useCurrencyBalance(account ?? undefined, inputCurrency)
  // we can always parse the amount typed as the input currency, since wrapping is 1:1
  const inputAmount = useMemo(() => tryParseAmount(typedValue, inputCurrency), [inputCurrency, typedValue])
  const addTransaction = useTransactionAdder()

  return useMemo(() => {
    // Debug: log all relevant values
    if (process.env.NODE_ENV === 'development') {
      const wethFromSDK = chainId ? WETH[chainId] : undefined
      // eslint-disable-next-line no-console
      console.log('[useWrapCallback] Debug info:', {
        wethContract: !!wethContract,
        wethContractAddress: wethContract?.address,
        chainId,
        inputCurrency: inputCurrency ? {
          symbol: inputCurrency.symbol,
          isETHER: inputCurrency === ETHER,
          address: inputCurrency instanceof Token ? inputCurrency.address : 'N/A',
        } : null,
        outputCurrency: outputCurrency ? {
          symbol: outputCurrency.symbol,
          isETHER: outputCurrency === ETHER,
          address: outputCurrency instanceof Token ? outputCurrency.address : 'N/A',
        } : null,
        wethFromSDK: wethFromSDK ? {
          address: wethFromSDK.address,
          symbol: wethFromSDK.symbol,
        } : null,
        currencyEqualsCheck: chainId && wethFromSDK && inputCurrency && outputCurrency ? {
          wrap: inputCurrency === ETHER && currencyEquals(wethFromSDK, outputCurrency),
          unwrap: currencyEquals(wethFromSDK, inputCurrency) && outputCurrency === ETHER,
        } : null,
      })
    }

    if (!wethContract || !chainId || !inputCurrency || !outputCurrency) return NOT_APPLICABLE

    const sufficientBalance = inputAmount && balance && !balance.lessThan(inputAmount)

    // 统一使用 SDK 的 WETH，SDK 中 ChainId.MAINNET = 2999，WETH[ChainId.MAINNET] 已经是 WBTY
    if (inputCurrency === ETHER && chainId && WETH[chainId] && currencyEquals(WETH[chainId], outputCurrency)) {
      const nativeSymbol = chainId === ChainId.MAINNET ? 'BTY' : 'BNB'
      const wrappedSymbol = chainId === ChainId.MAINNET ? 'WBTY' : 'WBNB'
      return {
        wrapType: WrapType.WRAP,
        execute:
          sufficientBalance && inputAmount
            ? (async (): Promise<string> => {
                const txReceipt = await wethContract.deposit({ value: `0x${inputAmount.raw.toString(16)}` })
                addTransaction(txReceipt, { summary: `Wrap ${inputAmount.toSignificant(6)} ${nativeSymbol} to ${wrappedSymbol}` })
                return txReceipt.hash
              })
            : undefined,
        inputError: sufficientBalance ? undefined : `Insufficient ${nativeSymbol} balance`
      }
    } 
    if (chainId && WETH[chainId] && currencyEquals(WETH[chainId], inputCurrency) && outputCurrency === ETHER) {
      const nativeSymbol = chainId === ChainId.MAINNET ? 'BTY' : 'BNB'
      const wrappedSymbol = chainId === ChainId.MAINNET ? 'WBTY' : 'WBNB'
      return {
        wrapType: WrapType.UNWRAP,
        execute:
          sufficientBalance && inputAmount
            ? (async (): Promise<string> => {
                const txReceipt = await wethContract.withdraw(`0x${inputAmount.raw.toString(16)}`)
                addTransaction(txReceipt, { summary: `Unwrap ${inputAmount.toSignificant(6)} ${wrappedSymbol} to ${nativeSymbol}` })
                return txReceipt.hash
              })
            : undefined,
        inputError: sufficientBalance ? undefined : `Insufficient ${wrappedSymbol} balance`
      }
    } 
    return NOT_APPLICABLE
  }, [wethContract, chainId, inputCurrency, outputCurrency, inputAmount, balance, addTransaction])
}
