import { useCallback, useEffect, useMemo, useState } from 'react'
import { Interface } from '@ethersproject/abi'
import { Contract } from '@ethersproject/contracts'
import { Token, Pair, TokenAmount, WETH, FACTORY_ADDRESS } from '@btyswap-libs/sdk'
import { useActiveWeb3React } from './index'
import { useLockContract, useMulticallContract } from './useContract'

// Factory ABI (minimal interface for allPairs and allPairsLength)
const FACTORY_ABI = [
  'function allPairsLength() external view returns (uint256)',
  'function allPairs(uint256) external view returns (address)',
]

// Pair ABI (minimal interface for token0, token1, getReserves)
const PAIR_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
]

// ERC20 ABI (minimal interface for balanceOf, decimals, symbol, name)
const ERC20_ABI = [
  'function balanceOf(address) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
]

interface UserLpTokenInfo {
  pair: Pair
  liquidityToken: Token
  balance: TokenAmount // Total balance (wallet + locked)
  lockedBalance?: TokenAmount // Locked balance (if any)
}

/**
 * Helper function to fetch token info (decimals, symbol, name)
 */
async function fetchTokenInfo(
  library: any,
  address: string,
  chainId: number
): Promise<{ decimals: number; symbol: string; name: string } | null> {
  try {
    // Check if it's WETH
    const weth = WETH[chainId as any]
    if (weth && address.toLowerCase() === weth.address.toLowerCase()) {
      return {
        decimals: weth.decimals,
        symbol: weth.symbol,
        name: weth.name,
      }
    }

    const tokenContract = new Contract(address, ERC20_ABI, library)
    const [decimals, symbol, name] = await Promise.all([
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name(),
    ])

    return {
      decimals: typeof decimals === 'number' ? decimals : decimals.toNumber(),
      symbol: symbol || 'UNKNOWN',
      name: name || 'Unknown Token',
    }
  } catch (err) {
    console.error(`Failed to fetch token info for ${address}:`, err)
    // Return default values if fetch fails
    return {
      decimals: 18,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
    }
  }
}

/**
 * Hook to fetch all LP tokens that the user has a balance for
 * This queries the factory contract to get all pairs, then checks user's balance for each
 */
// eslint-disable-next-line import/prefer-default-export
export function useUserLpTokens(): {
  lpTokens: UserLpTokenInfo[]
  loading: boolean
  error: Error | null
  refetch: () => void
} {
  const { account, library, chainId } = useActiveWeb3React()
  const lockContract = useLockContract(false)
  const multicallContract = useMulticallContract()
  const [lpTokens, setLpTokens] = useState<UserLpTokenInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const factoryContract = useMemo(() => {
    if (!library || !FACTORY_ADDRESS || !chainId) return null
    try {
      return new Contract(FACTORY_ADDRESS, FACTORY_ABI, library)
    } catch {
      return null
    }
  }, [library, chainId])

  const fetchUserLpTokens = useCallback(async () => {
    if (!account || !library || !factoryContract || !chainId) {
      setLpTokens([])
      setLoading(false)
      return
    }

    const erc20Interface = new Interface(ERC20_ABI)
    const pairInterface = new Interface(PAIR_ABI)

    setLoading(true)
    setError(null)

    try {
      // Step 1: Fetch user's locked LP tokens from lock contract
      const lockedLpTokens: Map<string, string> = new Map() // Map<lpTokenAddress, lockedAmount>
      if (lockContract) {
        try {
          const lockedLocks = await lockContract.lpLocksForUser(account)
          lockedLocks.forEach((lock: any) => {
            const lpTokenAddress = lock.token?.toLowerCase() || lock[1]?.toLowerCase()
            const lockedAmount = lock.amount?.toString() || lock[3]?.toString()
            if (lpTokenAddress && lockedAmount) {
              const existing = lockedLpTokens.get(lpTokenAddress) || '0'
              lockedLpTokens.set(lpTokenAddress, (BigInt(existing) + BigInt(lockedAmount)).toString())
            }
          })
        } catch (err) {
          console.warn('Failed to fetch locked LP tokens:', err)
          // Continue even if lock contract query fails
        }
      }

      // Step 2: Get total number of pairs
      const allPairsLength = await factoryContract.allPairsLength()
      const pairsCount = allPairsLength.toNumber()

      if (pairsCount === 0) {
        // If no pairs exist but user has locked LP tokens, we still need to process them
        if (lockedLpTokens.size === 0) {
          setLpTokens([])
          setLoading(false)
          return
        }
      }

      // Step 3: Fetch all pair addresses (batch in chunks to avoid overwhelming the RPC)
      const CHUNK_SIZE = 50
      const pairAddresses: string[] = []
      
      if (pairsCount > 0) {
        for (let i = 0; i < pairsCount; i += CHUNK_SIZE) {
          const chunkEnd = Math.min(i + CHUNK_SIZE, pairsCount)
          const chunkPromises = Array.from({ length: chunkEnd - i }, (_, j) =>
            factoryContract.allPairs(i + j)
          )
          const chunkAddresses = await Promise.all(chunkPromises)
          pairAddresses.push(...chunkAddresses)
        }
      }

      // Step 4: Batch check user's wallet balance for all pairs using multicall
      const balances: (any)[] = []
      if (pairAddresses.length > 0) {
        if (multicallContract) {
          // Use multicall to batch query balances (much faster)
          const balanceCalls = pairAddresses.map((addr) => ({
            target: addr,
            callData: erc20Interface.encodeFunctionData('balanceOf', [account]),
          }))
          
          // Multicall has a limit (~500 calls per chunk), so we need to chunk the calls
          const MULTICALL_CHUNK_SIZE = 500
          for (let i = 0; i < balanceCalls.length; i += MULTICALL_CHUNK_SIZE) {
            const chunk = balanceCalls.slice(i, i + MULTICALL_CHUNK_SIZE)
            try {
              const results = await multicallContract.aggregate(chunk.map(call => [call.target, call.callData]))
              const decodedResults = results.returnData.map((data: string) => {
                try {
                  if (!data || data === '0x') return null
                  const decoded = erc20Interface.decodeFunctionResult('balanceOf', data)
                  return decoded[0] // balanceOf returns a single uint256
                } catch {
                  return null
                }
              })
              balances.push(...decodedResults)
            } catch (err) {
              console.warn('Multicall failed for balance chunk, falling back to individual calls:', err)
              // Fallback to individual calls for this chunk
              const erc20Contracts = chunk.map((call) => new Contract(call.target, ERC20_ABI, library))
              const balancePromises = erc20Contracts.map((contract) =>
                contract.balanceOf(account).catch(() => null)
              )
              balances.push(...await Promise.all(balancePromises))
            }
          }
        } else {
          // Fallback to individual calls if multicall is not available
          const erc20Contracts = pairAddresses.map((addr) => new Contract(addr, ERC20_ABI, library))
          const balancePromises = erc20Contracts.map((contract) =>
            contract.balanceOf(account).catch(() => null)
          )
          balances.push(...await Promise.all(balancePromises))
        }
      }

      // Step 5: Combine wallet balances with locked balances
      // Create a map of all LP tokens (wallet + locked)
      const lpTokenBalanceMap = new Map<string, { walletBalance: string; lockedBalance: string }>()
      
      // Add wallet balances
      pairAddresses.forEach((addr, idx) => {
        const balance = balances[idx]
        // Handle both BigNumber (from individual calls) and string/number (from multicall)
        let balanceValue: string | null = null
        if (balance) {
          if (typeof balance === 'object' && 'isZero' in balance) {
            // BigNumber from individual calls
            balanceValue = !balance.isZero() ? balance.toString() : null
          } else {
            // String/number from multicall
            const balanceBigInt = BigInt(balance?.toString() || '0')
            balanceValue = balanceBigInt > BigInt(0) ? balance.toString() : null
          }
        }
        
        if (balanceValue) {
          const addrLower = addr.toLowerCase()
          const existing = lpTokenBalanceMap.get(addrLower) || { walletBalance: '0', lockedBalance: '0' }
          lpTokenBalanceMap.set(addrLower, {
            ...existing,
            walletBalance: balanceValue,
          })
        }
      })

      // Add locked balances
      lockedLpTokens.forEach((lockedAmount, lpTokenAddress) => {
        const existing = lpTokenBalanceMap.get(lpTokenAddress) || { walletBalance: '0', lockedBalance: '0' }
        lpTokenBalanceMap.set(lpTokenAddress, {
          ...existing,
          lockedBalance: lockedAmount,
        })
      })

      // Step 6: Get all unique LP token addresses (from wallet or locked)
      // Also include locked LP tokens that might not be in the factory pairs list
      lockedLpTokens.forEach((lockedAmount, lpTokenAddress) => {
        if (!lpTokenBalanceMap.has(lpTokenAddress)) {
          lpTokenBalanceMap.set(lpTokenAddress, { walletBalance: '0', lockedBalance: lockedAmount })
        }
      })
      
      const allLpTokenAddresses = Array.from(lpTokenBalanceMap.keys())

      // Filter pairs where user has total balance > 0 (wallet + locked)
      const pairsWithBalance = allLpTokenAddresses
        .map((addr) => {
          const balanceInfo = lpTokenBalanceMap.get(addr)
          if (!balanceInfo) return null
          const totalBalance = BigInt(balanceInfo.walletBalance) + BigInt(balanceInfo.lockedBalance)
          return {
            address: addr,
            lockedBalance: balanceInfo.lockedBalance,
            totalBalance: totalBalance.toString(),
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null && BigInt(item.totalBalance) > BigInt(0))

      if (pairsWithBalance.length === 0) {
        setLpTokens([])
        setLoading(false)
        return
      }

      // For pairs with balance, get detailed info using multicall
      // Step 7a: Batch query pair info (token0, token1, reserves) using multicall
      const pairInfoMap = new Map<string, { token0: string; token1: string; reserves: any }>()
      if (pairsWithBalance.length > 0 && multicallContract) {
        const pairCalls: Array<{ target: string; calls: Array<{ method: string; callData: string }> }> = []
        
        pairsWithBalance.forEach(({ address }) => {
          pairCalls.push({
            target: address,
            calls: [
              { method: 'token0', callData: pairInterface.encodeFunctionData('token0', []) },
              { method: 'token1', callData: pairInterface.encodeFunctionData('token1', []) },
              { method: 'getReserves', callData: pairInterface.encodeFunctionData('getReserves', []) },
            ],
          })
        })

        // Batch all pair calls using multicall
        const MULTICALL_CHUNK_SIZE = 150 // ~50 pairs per chunk (3 calls per pair)
        for (let i = 0; i < pairCalls.length; i += Math.floor(MULTICALL_CHUNK_SIZE / 3)) {
          const chunk = pairCalls.slice(i, i + Math.floor(MULTICALL_CHUNK_SIZE / 3))
          const flatCalls = chunk.flatMap(({ target, calls }) =>
            calls.map(call => [target, call.callData])
          )
          
          try {
            const results = await multicallContract.aggregate(flatCalls)
            let callIndex = 0
            chunk.forEach(({ target }) => {
              const token0Data = results.returnData[callIndex++]
              const token1Data = results.returnData[callIndex++]
              const reservesData = results.returnData[callIndex++]
              
              try {
                const token0 = pairInterface.decodeFunctionResult('token0', token0Data)[0]
                const token1 = pairInterface.decodeFunctionResult('token1', token1Data)[0]
                const reserves = pairInterface.decodeFunctionResult('getReserves', reservesData)
                pairInfoMap.set(target.toLowerCase(), {
                  token0,
                  token1,
                  reserves: {
                    reserve0: reserves.reserve0 || reserves[0],
                    reserve1: reserves.reserve1 || reserves[1],
                    blockTimestampLast: reserves.blockTimestampLast || reserves[2],
                  },
                })
              } catch (err) {
                console.warn(`Failed to decode pair info for ${target}:`, err)
              }
            })
          } catch (err) {
            console.warn('Multicall failed for pair info, falling back to individual calls:', err)
            // Fallback handled below
          }
        }
      }

      // Step 7b: Collect all unique token addresses and batch query their info
      const tokenAddressSet = new Set<string>()
      pairsWithBalance.forEach(({ address }) => {
        const pairInfo = pairInfoMap.get(address.toLowerCase())
        if (pairInfo) {
          const { token0, token1 } = pairInfo
          tokenAddressSet.add(token0.toLowerCase())
          tokenAddressSet.add(token1.toLowerCase())
        }
      })
      const uniqueTokenAddresses = Array.from(tokenAddressSet)

      // Batch query token info using multicall
      const tokenInfoMap = new Map<string, { decimals: number; symbol: string; name: string }>()
      if (uniqueTokenAddresses.length > 0 && multicallContract) {
        const tokenCalls = uniqueTokenAddresses.flatMap((addr) => [
          { target: addr, method: 'decimals', callData: erc20Interface.encodeFunctionData('decimals', []) },
          { target: addr, method: 'symbol', callData: erc20Interface.encodeFunctionData('symbol', []) },
          { target: addr, method: 'name', callData: erc20Interface.encodeFunctionData('name', []) },
        ])

        const MULTICALL_CHUNK_SIZE = 450 // ~150 tokens per chunk (3 calls per token)
        for (let i = 0; i < tokenCalls.length; i += MULTICALL_CHUNK_SIZE) {
          const chunk = tokenCalls.slice(i, i + MULTICALL_CHUNK_SIZE)
          try {
            const results = await multicallContract.aggregate(chunk.map(call => [call.target, call.callData]))
            let callIndex = 0
            for (let j = 0; j < uniqueTokenAddresses.length && callIndex < chunk.length; j++) {
              const addr = uniqueTokenAddresses[j]
              try {
                const decimalsData = results.returnData[callIndex++]
                const symbolData = results.returnData[callIndex++]
                const nameData = results.returnData[callIndex++]
                
                const decimals = erc20Interface.decodeFunctionResult('decimals', decimalsData)[0]
                const symbol = erc20Interface.decodeFunctionResult('symbol', symbolData)[0]
                const name = erc20Interface.decodeFunctionResult('name', nameData)[0]
                
                tokenInfoMap.set(addr.toLowerCase(), {
                  decimals: typeof decimals === 'number' ? decimals : decimals.toNumber(),
                  symbol: symbol || 'UNKNOWN',
                  name: name || 'Unknown Token',
                })
              } catch (err) {
                console.warn(`Failed to decode token info for ${addr}:`, err)
                // Use WETH info if it's WETH
                const weth = WETH[chainId as any]
                if (weth && addr.toLowerCase() === weth.address.toLowerCase()) {
                  tokenInfoMap.set(addr.toLowerCase(), {
                    decimals: weth.decimals,
                    symbol: weth.symbol,
                    name: weth.name,
                  })
                }
              }
            }
          } catch (err) {
            console.warn('Multicall failed for token info, falling back to individual calls:', err)
            // Fallback handled below
          }
        }
      }

      // Step 7c: Process pairs with balance using cached info or fallback to individual calls
      const lpTokenPromises = pairsWithBalance.map(async ({ address: pairAddress, lockedBalance, totalBalance }) => {
        try {
          let token0Address: string
          let token1Address: string
          let reserves: any

          // Try to use cached pair info from multicall
          const cachedPairInfo = pairInfoMap.get(pairAddress.toLowerCase())
          if (cachedPairInfo) {
            const { token0: cachedToken0, token1: cachedToken1, reserves: cachedReserves } = cachedPairInfo
            token0Address = cachedToken0
            token1Address = cachedToken1
            reserves = cachedReserves
          } else {
            // Fallback to individual call
            const pairContract = new Contract(pairAddress, PAIR_ABI, library)
            const [token0, token1, reservesResult] = await Promise.all([
              pairContract.token0(),
              pairContract.token1(),
              pairContract.getReserves(),
            ])
            token0Address = token0
            token1Address = token1
            reserves = reservesResult
          }

          // Try to use cached token info from multicall
          let token0Info = tokenInfoMap.get(token0Address.toLowerCase())
          let token1Info = tokenInfoMap.get(token1Address.toLowerCase())

          // Fallback to individual calls if not cached
          if (!token0Info) {
            const fetchedToken0Info = await fetchTokenInfo(library, token0Address, chainId)
            if (fetchedToken0Info) {
              tokenInfoMap.set(token0Address.toLowerCase(), fetchedToken0Info)
              token0Info = fetchedToken0Info
            }
          }
          if (!token1Info) {
            const fetchedToken1Info = await fetchTokenInfo(library, token1Address, chainId)
            if (fetchedToken1Info) {
              tokenInfoMap.set(token1Address.toLowerCase(), fetchedToken1Info)
              token1Info = fetchedToken1Info
            }
          }

          if (!token0Info || !token1Info) {
            return null
          }

          // Create Token instances
          const token0Temp = new Token(chainId, token0Address, token0Info.decimals, token0Info.symbol, token0Info.name)
          const token1Temp = new Token(chainId, token1Address, token1Info.decimals, token1Info.symbol, token1Info.name)

          // Ensure tokens are in the correct order (token0 < token1)
          const token0 = token0Temp.sortsBefore(token1Temp) ? token0Temp : token1Temp
          const token1 = token0Temp.sortsBefore(token1Temp) ? token1Temp : token0Temp
          
          // Get reserves in the correct order
          const reserve0 = token0Temp.sortsBefore(token1Temp) ? reserves.reserve0 : reserves.reserve1
          const reserve1 = token0Temp.sortsBefore(token1Temp) ? reserves.reserve1 : reserves.reserve0

          // Create Pair instance
          const pair = new Pair(
            new TokenAmount(token0, reserve0.toString()),
            new TokenAmount(token1, reserve1.toString())
          )
          
          // Verify the pair address matches
          const expectedPairAddress = Pair.getAddress(token0, token1)
          if (expectedPairAddress.toLowerCase() !== pairAddress.toLowerCase()) {
            console.warn(`Pair address mismatch: expected ${expectedPairAddress}, got ${pairAddress}`)
          }

          // Create LP token
          const liquidityToken = new Token(chainId, pairAddress, 18, 'BTY-LP', 'Bityuan LPs')

          // Create balance TokenAmount (total = wallet + locked)
          const totalBalanceAmount = new TokenAmount(liquidityToken, totalBalance)
          const lockedBalanceAmount = BigInt(lockedBalance) > BigInt(0)
            ? new TokenAmount(liquidityToken, lockedBalance)
            : undefined

          return {
            pair,
            liquidityToken,
            balance: totalBalanceAmount,
            lockedBalance: lockedBalanceAmount,
          } as UserLpTokenInfo
        } catch (err: any) {
          console.error(`Failed to fetch pair ${pairAddress}:`, err)
          return null
        }
      })

      const results = await Promise.all(lpTokenPromises)
      const validLpTokens = results.filter((token): token is UserLpTokenInfo => token !== null)

      setLpTokens(validLpTokens)
    } catch (err: any) {
      console.error('Failed to fetch user LP tokens:', err)
      setError(err)
      setLpTokens([])
    } finally {
      setLoading(false)
    }
  }, [account, library, factoryContract, chainId, lockContract, multicallContract])

  useEffect(() => {
    fetchUserLpTokens()
  }, [fetchUserLpTokens])

  return {
    lpTokens,
    loading,
    error,
    refetch: fetchUserLpTokens,
  }
}
