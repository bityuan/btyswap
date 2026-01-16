/**
 * 直接连接钱包和登录的 Hook
 */
import { useCallback, useEffect, useState } from 'react'
import { useWeb3React } from '@web3-react/core'
import { connectorLocalStorageKey } from '@pancakeswap-libs/uikit'
import { injected } from '../connectors'
import { authUtil } from '../utils/auth'
import {
  checkWallet,
  getAccount,
  requestAccount,
  getNonce,
  authRequest,
  checkAccAndNet,
  checkWalletInstalled,
} from '../utils/wallet'
import useToast from './useToast'

/**
 * 从 URL 中获取邀请地址
 */
function getInvitorFromUrl(): string | null {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const address = urlParams.get('address')
    return address || null
  } catch (error) {
    console.error('Failed to parse URL params:', error)
    return null
  }
}

export default function useDirectAuth() {
  const { chainId, activate, deactivate } = useWeb3React()
  const { toastError, toastSuccess } = useToast()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLogged, setIsLogged] = useState(false)

  // 检查登录状态
  useEffect(() => {
    const logged = authUtil.isLogged()
    setIsLogged(logged)
  }, [])

  /**
   * 登出
   */
  const handleLogout = useCallback(() => {
    authUtil.logout()
    deactivate()
    window.localStorage.removeItem(connectorLocalStorageKey)
    setIsLogged(false)
  }, [deactivate])

  // 监听钱包账户变化
  useEffect(() => {
    const { ethereum } = window

    if (!ethereum || !ethereum.on) {
      return undefined
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      const newAccount = accounts && accounts.length > 0 ? accounts[0] : null
      const currentLoggedAccount = authUtil.getUser()
      
      // 如果账户变化（包括切换到空账户或切换到不同账户），强制退出登录
      if (currentLoggedAccount) {
        // 如果账户被清空（用户断开连接）
        if (!newAccount) {
          // 先清除连接信息，防止自动重连
          window.localStorage.removeItem(connectorLocalStorageKey)
          // 断开 Web3React 连接
          deactivate()
          // 退出登录
          handleLogout()
          return
        }
        
        // 如果切换到不同的账户
        if (newAccount.toLowerCase() !== currentLoggedAccount.toLowerCase()) {
          // 先清除连接信息，防止自动重连
          window.localStorage.removeItem(connectorLocalStorageKey)
          // 断开 Web3React 连接
          deactivate()
          // 退出登录
          handleLogout()
        }
      }
    }

    const handleChainChanged = async () => {
      // 网络变化时，检查是否需要退出登录
      const shouldLogout = await checkAccAndNet()
      if (shouldLogout) {
        handleLogout()
        // 清除连接信息，防止自动重连
        window.localStorage.removeItem(connectorLocalStorageKey)
        deactivate()
      }
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)

    return () => {
      if (ethereum.removeListener) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged)
        ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [handleLogout, deactivate])

  /**
   * 直接连接钱包并登录
   */
  const handleLogin = useCallback(async () => {
    if (isConnecting) return

    let isActivated = false

    try {
      setIsConnecting(true)

      // 1. 检查钱包是否安装
      if (!checkWalletInstalled()) {
        toastError('Wallet Not Installed', 'Please install MetaMask or another Web3 wallet')
        return
      }

      // 2. 检查钱包和网络
      await checkWallet()

      // 等待网络切换完成，给钱包一点时间更新状态
      await new Promise(resolve => setTimeout(resolve, 500))

      // 3. 连接钱包（Web3React）
      let currentAccount = await getAccount()
      if (!currentAccount) {
        currentAccount = await requestAccount()
      }

      if (!currentAccount) {
        toastError('Connection Failed', 'Failed to connect wallet')
        return
      }

      // 激活 Web3React 连接器（重新激活以确保状态刷新）
      try {
        deactivate()
      } catch (e) {
        // ignore
      }
      await activate(injected, undefined, true)
      window.localStorage.setItem(connectorLocalStorageKey, 'Injected')
      isActivated = true

      // 4. 如果已经登录，检查账户是否匹配
      if (authUtil.isLogged()) {
        const authData = authUtil.getAuthData()
        if (authData && authData.account === currentAccount) {
          setIsLogged(true)
          toastSuccess('Connected', 'Wallet connected successfully')
          return
        }
      }

      // 5. 获取 nonce 并签名
      const nonceData = await getNonce(currentAccount)
      if (!nonceData) {
        // 签名失败，断开连接
        if (isActivated) {
          deactivate()
          window.localStorage.removeItem(connectorLocalStorageKey)
        }
        toastError('Login Failed', 'Failed to get nonce or sign message')
        return
      }

      // 6. 从 URL 中获取邀请地址
      const invitor = getInvitorFromUrl()

      // 7. 获取 token（传递邀请地址）
      const authData = await authRequest(
        currentAccount,
        nonceData.signature,
        nonceData.nonce,
        invitor || undefined
      )

      if (!authData || !authData.accessToken) {
        // 认证失败，断开连接
        if (isActivated) {
          deactivate()
          window.localStorage.removeItem(connectorLocalStorageKey)
        }
        toastError('Login Failed', 'Failed to authenticate')
        return
      }

      // 8. 保存登录信息
      authUtil.login(
        currentAccount,
        authData.accessToken,
        authData.userType,
        chainId || 2999
      )

      // 9. 登录成功后，清除 URL 中的邀请参数（可选，避免刷新后重复使用）
      if (invitor) {
        const url = new URL(window.location.href)
        url.searchParams.delete('address')
        window.history.replaceState({}, '', url.toString())
      }

      setIsLogged(true)
      toastSuccess('Login Success', 'Successfully logged in')
    } catch (error: any) {
      console.error('Login error:', error)
      
      // 如果已经激活了连接器，需要断开
      if (isActivated) {
        deactivate()
        window.localStorage.removeItem(connectorLocalStorageKey)
      }
      
      if (error.message?.includes('User rejected')) {
        toastError('User Rejected', 'Please approve the signature request')
      } else if (error.message?.includes('Wallet not installed')) {
        toastError('Wallet Not Installed', 'Please install MetaMask or another Web3 wallet')
      } else if (error.message?.includes('switch to chain')) {
        toastError('Wrong Network', error.message)
      } else {
        toastError('Login Failed', error.message || 'Failed to login')
      }
    } finally {
      setIsConnecting(false)
    }
  }, [activate, deactivate, chainId, isConnecting, toastError, toastSuccess])

  /**
   * 检查是否已登录
   */
  const checkLogin = useCallback(() => {
    return authUtil.isLogged()
  }, [])

  return {
    handleLogin,
    handleLogout,
    checkLogin,
    isConnecting,
    isLogged,
  }
}

