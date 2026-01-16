import flatMap from 'lodash.flatmap'
import { useMemo, useState, useEffect } from 'react'
import { Currency, CurrencyAmount, Pair, Token, Trade } from '@btyswap-libs/sdk'

import { BASES_TO_CHECK_TRADES_AGAINST, CUSTOM_BASES } from '../constants'
import { PairState, usePairs } from '../data/Reserves'
import { wrappedCurrency, wrappedCurrencyAmount } from '../utils/wrappedCurrency'

import { useActiveWeb3React } from './index'

function useAllCommonPairs(currencyA?: Currency, currencyB?: Currency): Pair[] {
  const { chainId } = useActiveWeb3React()

  // Base tokens for building intermediary trading routes
  const bases: Token[] = useMemo(() => (chainId ? BASES_TO_CHECK_TRADES_AGAINST[chainId] : []), [chainId])

  // All pairs from base tokens
  const basePairs: [Token, Token][] = useMemo(
    () =>
      flatMap(bases, (base): [Token, Token][] => bases.map((otherBase) => [base, otherBase])).filter(
        ([t0, t1]) => t0.address !== t1.address
      ),
    [bases]
  )

  const [tokenA, tokenB] = chainId
    ? [wrappedCurrency(currencyA, chainId), wrappedCurrency(currencyB, chainId)]
    : [undefined, undefined]

  const allPairCombinations: [Token, Token][] = useMemo(
    () =>
      tokenA && tokenB
        ? [
            // the direct pair
            [tokenA, tokenB],
            // token A against all bases
            ...bases.map((base): [Token, Token] => [tokenA, base]),
            // token B against all bases
            ...bases.map((base): [Token, Token] => [tokenB, base]),
            // each base against all bases
            ...basePairs,
          ]
            .filter((tokens): tokens is [Token, Token] => Boolean(tokens[0] && tokens[1]))
            .filter(([t0, t1]) => t0.address !== t1.address)
            // This filter will remove all the pairs that are not supported by the CUSTOM_BASES settings
            // This option is currently not used on Pancake swap
            .filter(([t0, t1]) => {
              if (!chainId) return true
              const customBases = CUSTOM_BASES[chainId]
              if (!customBases) return true

              const customBasesA: Token[] | undefined = customBases[t0.address]
              const customBasesB: Token[] | undefined = customBases[t1.address]

              if (!customBasesA && !customBasesB) return true
              if (customBasesA && !customBasesA.find((base) => t1.equals(base))) return false
              if (customBasesB && !customBasesB.find((base) => t0.equals(base))) return false

              return true
            })
        : [],
    [tokenA, tokenB, bases, basePairs, chainId]
  )

  const allPairs = usePairs(allPairCombinations)

  // only pass along valid pairs, non-duplicated pairs
  return useMemo(
    () => {
      const validPairs = Object.values(
        allPairs
          // filter out invalid pairs
          .filter((result): result is [PairState.EXISTS, Pair] => Boolean(result[0] === PairState.EXISTS && result[1]))
          // filter out duplicated pairs
          .reduce<{ [pairAddress: string]: Pair }>((memo, [, curr]) => {
            memo[curr.liquidityToken.address] = memo[curr.liquidityToken.address] ?? curr
            return memo
          }, {})
      )
      
      // 添加额外的验证，确保所有 pair 的 token 都有 decimals
      const filteredPairs = validPairs.filter(pair => {
        const isValid = pair.token0?.decimals !== undefined && pair.token1?.decimals !== undefined
        if (!isValid) {
          console.warn('Filtering out invalid pair:', {
            token0: pair.token0,
            token1: pair.token1,
            token0Decimals: pair.token0?.decimals,
            token1Decimals: pair.token1?.decimals
          })
        }
        return isValid
      })
      
      return filteredPairs
    },
    [allPairs]
  )
}

/**
 * Returns the best trade for the exact amount of tokens in to the given token out
 */
export function useTradeExactIn(currencyAmountIn?: CurrencyAmount, currencyOut?: Currency): Trade | null {
  const { chainId } = useActiveWeb3React()
  const allowedPairs = useAllCommonPairs(currencyAmountIn?.currency, currencyOut)
  const [retryCount, setRetryCount] = useState(0)
  
  // 使用 useMemo 来缓存计算结果，避免重复计算
  const trade = useMemo(() => {
    if (currencyAmountIn && currencyOut && allowedPairs.length > 0) {
      // 添加更严格的验证
      if (!currencyAmountIn.currency || !currencyAmountIn.currency.decimals) {
        console.warn('Invalid currencyAmountIn.currency:', currencyAmountIn.currency)
        return null
      }
      
      if (!currencyOut || !currencyOut.decimals) {
        console.warn('Invalid currencyOut:', currencyOut)
        return null
      }
      
      try {       
        // 在调用 Trade.bestTradeExactIn 之前，确保 currencyAmountIn 是 TokenAmount
        const wrappedAmountIn = wrappedCurrencyAmount(currencyAmountIn, chainId as any)
        
        if (!wrappedAmountIn) {
          console.warn('Failed to wrap currencyAmountIn:', currencyAmountIn)
          return null
        }
        
        return Trade.bestTradeExactIn(allowedPairs, wrappedAmountIn, currencyOut, { maxHops: 3, maxNumResults: 1 })[0] ?? null
      } catch (error) {
        console.warn('Trade calculation failed:', error)
        return null
      }
    }
    return null
  }, [allowedPairs, currencyAmountIn, currencyOut, chainId])
  
  // 使用 useEffect 来处理重试逻辑，避免在 useMemo 中产生副作用
  useEffect(() => {
    // 如果有输入但计算失败，且 allowedPairs 有数据，则安排重试
    if (currencyAmountIn && currencyOut && allowedPairs.length > 0 && !trade && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1)
      }, 1000) // 1秒后重试
      
      return () => clearTimeout(timer)
    }
    return undefined
  }, [currencyAmountIn, currencyOut, allowedPairs.length, trade, retryCount])
  
  // 当 retryCount 变化时，强制重新计算
  const tradeWithRetry = useMemo(() => {
    if (retryCount > 0 && currencyAmountIn && currencyOut && allowedPairs.length > 0) {
      // 添加更严格的验证
      if (!currencyAmountIn.currency || !currencyAmountIn.currency.decimals) {
        console.warn('Invalid currencyAmountIn.currency in retry:', currencyAmountIn.currency)
        return null
      }
      
      if (!currencyOut || !currencyOut.decimals) {
        console.warn('Invalid currencyOut in retry:', currencyOut)
        return null
      }
      
      try {
        // 在调用 Trade.bestTradeExactIn 之前，确保 currencyAmountIn 是 TokenAmount
        const wrappedAmountIn = wrappedCurrencyAmount(currencyAmountIn, chainId as any)
        
        if (!wrappedAmountIn) {
          console.warn('Failed to wrap currencyAmountIn in retry:', currencyAmountIn)
          return null
        }
        
        return Trade.bestTradeExactIn(allowedPairs, wrappedAmountIn, currencyOut, { maxHops: 3, maxNumResults: 1 })[0] ?? null
      } catch (error) {
        console.warn('Trade calculation retry failed:', error)
        return null
      }
    }
    return trade
  }, [trade, retryCount, allowedPairs, currencyAmountIn, currencyOut, chainId])
  
  return tradeWithRetry
}

/**
 * Returns the best trade for the token in to the exact amount of token out
 */
export function useTradeExactOut(currencyIn?: Currency, currencyAmountOut?: CurrencyAmount): Trade | null {
  const { chainId } = useActiveWeb3React()
  const allowedPairs = useAllCommonPairs(currencyIn, currencyAmountOut?.currency)
  const [retryCount, setRetryCount] = useState(0)

  // 使用 useMemo 来缓存计算结果，避免重复计算
  const trade = useMemo(() => {
    if (currencyIn && currencyAmountOut && allowedPairs.length > 0) {
      // 添加更严格的验证
      if (!currencyIn || !currencyIn.decimals) {
        console.warn('Invalid currencyIn:', currencyIn)
        return null
      }
      
      if (!currencyAmountOut.currency || !currencyAmountOut.currency.decimals) {
        console.warn('Invalid currencyAmountOut.currency:', currencyAmountOut.currency)
        return null
      }
      
      try {
        // 在调用 Trade.bestTradeExactOut 之前，确保 currencyAmountOut 是 TokenAmount
        const wrappedAmountOut = wrappedCurrencyAmount(currencyAmountOut, chainId as any)
        
        if (!wrappedAmountOut) {
          console.warn('Failed to wrap currencyAmountOut:', currencyAmountOut)
          return null
        }
        
        return (
          Trade.bestTradeExactOut(allowedPairs, currencyIn, wrappedAmountOut, { maxHops: 3, maxNumResults: 1 })[0] ??
          null
        )
      } catch (error) {
        console.warn('Trade calculation failed:', error)
        return null
      }
    }
    return null
  }, [allowedPairs, currencyIn, currencyAmountOut, chainId])

  // 使用 useEffect 来处理重试逻辑，避免在 useMemo 中产生副作用
  useEffect(() => {
    // 如果有输入但计算失败，且 allowedPairs 有数据，则安排重试
    if (currencyIn && currencyAmountOut && allowedPairs.length > 0 && !trade && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1)
      }, 1000) // 1秒后重试
      
      return () => clearTimeout(timer)
    }
    return undefined
  }, [currencyIn, currencyAmountOut, allowedPairs.length, trade, retryCount])

  // 当 retryCount 变化时，强制重新计算
  const tradeWithRetry = useMemo(() => {
    if (retryCount > 0 && currencyIn && currencyAmountOut && allowedPairs.length > 0) {
      // 添加更严格的验证
      if (!currencyIn || !currencyIn.decimals) {
        console.warn('Invalid currencyIn in retry:', currencyIn)
        return null
      }
      
      if (!currencyAmountOut.currency || !currencyAmountOut.currency.decimals) {
        console.warn('Invalid currencyAmountOut.currency in retry:', currencyAmountOut.currency)
        return null
      }
      
      try {
        // 在调用 Trade.bestTradeExactOut 之前，确保 currencyAmountOut 是 TokenAmount
        const wrappedAmountOut = wrappedCurrencyAmount(currencyAmountOut, chainId as any)
        
        if (!wrappedAmountOut) {
          console.warn('Failed to wrap currencyAmountOut in retry:', currencyAmountOut)
          return null
        }
        
        return (
          Trade.bestTradeExactOut(allowedPairs, currencyIn, wrappedAmountOut, { maxHops: 3, maxNumResults: 1 })[0] ??
          null
        )
      } catch (error) {
        console.warn('Trade calculation retry failed:', error)
        return null
      }
    }
    return trade
  }, [trade, retryCount, allowedPairs, currencyIn, currencyAmountOut, chainId])

  return tradeWithRetry
}
