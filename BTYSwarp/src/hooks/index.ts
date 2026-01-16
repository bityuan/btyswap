import { Web3Provider } from '@ethersproject/providers'
import { ChainId } from '@pancakeswap-libs/sdk'
import { connectorLocalStorageKey } from '@pancakeswap-libs/uikit'
import { useWeb3React as useWeb3ReactCore } from '@web3-react/core'
// eslint-disable-next-line import/no-unresolved
import { Web3ReactContextInterface } from '@web3-react/core/dist/types'
import { useEffect, useState } from 'react'
import { isMobile } from 'react-device-detect'
import { injected } from '../connectors'
import { NetworkContextName } from '../constants'
import { authUtil } from '../utils/auth'

export function useActiveWeb3React(): Web3ReactContextInterface<Web3Provider> & { chainId?: ChainId } {
  const context = useWeb3ReactCore<Web3Provider>()
  const contextNetwork = useWeb3ReactCore<Web3Provider>(NetworkContextName)
  return context.active ? context : contextNetwork
}

export function useEagerConnect() {
  const { activate, active } = useWeb3ReactCore() // specifically using useWeb3ReactCore because of what this hook does
  const [tried, setTried] = useState(false)

  useEffect(() => {
    injected.isAuthorized().then((isAuthorized) => {
      const hasSignedIn = window.localStorage.getItem(connectorLocalStorageKey)
      if (isAuthorized && hasSignedIn) {
        activate(injected, undefined, true).catch(() => {
          setTried(true)
        })
      } else if (isMobile && window.ethereum && hasSignedIn) {
        activate(injected, undefined, true).catch(() => {
          setTried(true)
        })
      } else {
        setTried(true)
      }
    })
  }, [activate]) // intentionally only running on mount (make sure it's only mounted once :))

  // if the connection worked, wait until we get confirmation of that to flip the flag
  useEffect(() => {
    if (active) {
      setTried(true)
    }
  }, [active])

  return tried
}

/**
 * Use for network and injected - logs user in
 * and out after checking what network theyre on
 */
export function useInactiveListener(suppress = false) {
  const { active, error, activate } = useWeb3ReactCore() // specifically using useWeb3React because of what this hook does

  useEffect(() => {
    const { ethereum } = window

    if (ethereum && ethereum.on && !active && !error && !suppress) {
      const handleChainChanged = () => {
        // eat errors
        activate(injected, undefined, true).catch((e) => {
          console.error('Failed to activate after chain changed', e)
        })
      }

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          // 检查是否有登录状态，如果有登录状态，说明可能是账户切换
          // 账户切换应该由 useDirectAuth 处理，不应该自动连接
          const isLogged = authUtil.isLogged()
          const loggedAccount = authUtil.getUser()
          const newAccount = accounts[0]
          
          // 如果已登录且账户变化，不自动连接（让 useDirectAuth 处理）
          if (isLogged && loggedAccount && newAccount.toLowerCase() !== loggedAccount.toLowerCase()) {
            return
          }
          
          // 检查是否有连接信息，如果没有则不自动连接
          const hasSignedIn = window.localStorage.getItem(connectorLocalStorageKey)
          if (hasSignedIn) {
            // eat errors
            activate(injected, undefined, true).catch((e) => {
              console.error('Failed to activate after accounts changed', e)
            })
          }
        }
      }

      ethereum.on('chainChanged', handleChainChanged)
      ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener('chainChanged', handleChainChanged)
          ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }
    return undefined
  }, [active, error, suppress, activate])
}


