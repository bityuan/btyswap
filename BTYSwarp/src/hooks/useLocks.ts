import { useCallback, useEffect, useState } from 'react'
import { BigNumber } from '@ethersproject/bignumber'
import { useLockContract } from './useContract'

export interface LockInfo {
  id: string
  token: string
  owner: string
  amount: string // Keep as BigNumber hex string for proper formatting
  lockDate: number
  tgeDate: number
  tgeBps: number
  cycle: number
  cycleBps: number
  unlockedAmount: string // Keep as BigNumber hex string for proper formatting
  description: string
  isLpToken: boolean
}

function formatLockInfo(lock: any, isLpTokenFlag: boolean): LockInfo {
  // Handle both array format (from tuple) and object format
  // If lock is an array, convert it to object format
  let lockObj: any
  if (Array.isArray(lock)) {
    lockObj = {
      id: lock[0],
      token: lock[1],
      owner: lock[2],
      amount: lock[3],
      lockDate: lock[4],
      tgeDate: lock[5],
      tgeBps: lock[6],
      cycle: lock[7],
      cycleBps: lock[8],
      unlockedAmount: lock[9],
      description: lock[10],
    }
  } else {
    lockObj = lock
  }

  // Keep amount and unlockedAmount as BigNumber hex strings
  // This allows formatUnits to work correctly with different token decimals
  const amountBN = BigNumber.isBigNumber(lockObj.amount) 
    ? lockObj.amount 
    : BigNumber.from(lockObj.amount)
  const unlockedAmountBN = BigNumber.isBigNumber(lockObj.unlockedAmount)
    ? lockObj.unlockedAmount
    : BigNumber.from(lockObj.unlockedAmount)

  return {
    id: lockObj.id.toString(),
    token: lockObj.token,
    owner: lockObj.owner,
    amount: amountBN._hex, // Store as hex string, can be converted back to BigNumber
    lockDate: Number(lockObj.lockDate),
    tgeDate: Number(lockObj.tgeDate),
    tgeBps: Number(lockObj.tgeBps),
    cycle: Number(lockObj.cycle),
    cycleBps: Number(lockObj.cycleBps),
    unlockedAmount: unlockedAmountBN._hex, // Store as hex string
    description: lockObj.description,
    isLpToken: isLpTokenFlag,
  }
}

// Hook to fetch user's normal token locks
export function useNormalLocksForUser(userAddress: string | null | undefined) {
  const lockContract = useLockContract(false)
  const [locks, setLocks] = useState<LockInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchLocks = useCallback(async () => {
    if (!lockContract) {
      setLocks([])
      setLoading(false)
      return
    }

    if (!userAddress) {
      setLocks([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await lockContract.normalLocksForUser(userAddress)
      const formattedLocks = result.map((lock: any) => formatLockInfo(lock, false))
      setLocks(formattedLocks)
    } catch (err: any) {
      console.error('Failed to fetch normal locks:', err)
      setError(err)
      setLocks([])
    } finally {
      setLoading(false)
    }
  }, [lockContract, userAddress])

  useEffect(() => {
    fetchLocks()
  }, [fetchLocks, lockContract, userAddress])

  return { locks, loading, error, refetch: fetchLocks }
}

// Hook to fetch user's LP token locks
export function useLpLocksForUser(userAddress: string | null | undefined) {
  const lockContract = useLockContract(false)
  const [locks, setLocks] = useState<LockInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchLocks = useCallback(async () => {
    if (!lockContract) {
      setLocks([])
      setLoading(false)
      return
    }

    if (!userAddress) {
      setLocks([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await lockContract.lpLocksForUser(userAddress)
      const formattedLocks = result.map((lock: any) => formatLockInfo(lock, true))
      setLocks(formattedLocks)
    } catch (err: any) {
      console.error('Failed to fetch LP locks:', err)
      setError(err)
      setLocks([])
    } finally {
      setLoading(false)
    }
  }, [lockContract, userAddress])

  useEffect(() => {
    fetchLocks()
  }, [fetchLocks, lockContract, userAddress])

  return { locks, loading, error, refetch: fetchLocks }
}

// Hook to fetch all normal token locks
export function useAllNormalLocks() {
  const lockContract = useLockContract(false)
  const [locks, setLocks] = useState<LockInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchAllLocks = useCallback(async () => {
    if (!lockContract) {
      setLocks([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get normal token count
      const tokenCount = await lockContract.allNormalTokenLockedCount()
      const tokenCountNumber = tokenCount.toNumber()
      
      // Fetch all normal tokens and their locks
      const allLocks: LockInfo[] = []
      
      // Iterate through each normal token
      const tokenPromises = Array.from({ length: tokenCountNumber }, async (_, i) => {
        try {
          // Get token info at index i
          const tokenInfo = await lockContract.getCumulativeNormalTokenLockInfoAt(i)
          const tokenAddress = tokenInfo.token
          
          // Get lock count for this token
          const lockCount = await lockContract.totalLockCountForToken(tokenAddress)
          const lockCountNumber = lockCount.toNumber()
          
          if (lockCountNumber > 0) {
            // Get all locks for this token (start from 0 to lockCount - 1)
            const tokenLocks = await lockContract.getLocksForToken(
              tokenAddress,
              0,
              lockCountNumber - 1
            )
            
            // Format and add to allLocks
            const formattedLocks = tokenLocks.map((lock: any) => formatLockInfo(lock, false))
            allLocks.push(...formattedLocks)
          }
        } catch (err: any) {
          console.error(`Failed to fetch normal token at index ${i}:`, err)
        }
      })

      await Promise.all(tokenPromises)
      
      setLocks(allLocks)
    } catch (err: any) {
      console.error('Failed to fetch all normal locks:', err)
      setError(err)
      setLocks([])
    } finally {
      setLoading(false)
    }
  }, [lockContract])

  useEffect(() => {
    fetchAllLocks()
  }, [fetchAllLocks])

  return { locks, loading, error, refetch: fetchAllLocks }
}

// Hook to fetch all LP token locks
export function useAllLpLocks() {
  const lockContract = useLockContract(false)
  const [locks, setLocks] = useState<LockInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchAllLocks = useCallback(async () => {
    if (!lockContract) {
      setLocks([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get LP token count
      const tokenCount = await lockContract.allLpTokenLockedCount()
      const tokenCountNumber = tokenCount.toNumber()
      
      // Fetch all LP tokens and their locks
      const allLocks: LockInfo[] = []
      
      // Iterate through each LP token
      const tokenPromises = Array.from({ length: tokenCountNumber }, async (_, i) => {
        try {
          // Get token info at index i
          const tokenInfo = await lockContract.getCumulativeLpTokenLockInfoAt(i)
          const tokenAddress = tokenInfo.token
          
          // Get lock count for this token
          const lockCount = await lockContract.totalLockCountForToken(tokenAddress)
          const lockCountNumber = lockCount.toNumber()
          
          if (lockCountNumber > 0) {
            // Get all locks for this token (start from 0 to lockCount - 1)
            const tokenLocks = await lockContract.getLocksForToken(
              tokenAddress,
              0,
              lockCountNumber - 1
            )
            
            // Format and add to allLocks
            const formattedLocks = tokenLocks.map((lock: any) => formatLockInfo(lock, true))
            allLocks.push(...formattedLocks)
          }
        } catch (err: any) {
          console.error(`Failed to fetch LP token at index ${i}:`, err)
        }
      })

      await Promise.all(tokenPromises)
      
      setLocks(allLocks)
    } catch (err: any) {
      console.error('Failed to fetch all LP locks:', err)
      setError(err)
      setLocks([])
    } finally {
      setLoading(false)
    }
  }, [lockContract])

  useEffect(() => {
    fetchAllLocks()
  }, [fetchAllLocks])

  return { locks, loading, error, refetch: fetchAllLocks }
}

// Hook to fetch lock details by ID
export function useLockInfo(lockId: string | null | undefined) {
  const lockContract = useLockContract(false)
  const [lock, setLock] = useState<LockInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchLock = useCallback(async () => {
    if (!lockContract || !lockId) {
      setLock(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await lockContract.getLockInfo(lockId)
      // We need to determine if it's LP token - for now assume false
      // In a real implementation, you might need to check if token is a pair
      setLock(formatLockInfo(result, false))
    } catch (err: any) {
      console.error('Failed to fetch lock info:', err)
      setError(err)
      setLock(null)
    } finally {
      setLoading(false)
    }
  }, [lockContract, lockId])

  useEffect(() => {
    fetchLock()
  }, [fetchLock])

  return { lock, loading, error, refetch: fetchLock }
}
