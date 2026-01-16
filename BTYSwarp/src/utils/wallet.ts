/**
 * 钱包相关工具函数
 */

import { apiGet, apiPost } from './api'
import { authUtil } from './auth'

/**
 * 检查钱包是否安装
 */
export function checkWalletInstalled(): boolean {
  return typeof window.ethereum !== 'undefined'
}

/**
 * 获取当前账户地址
 */
export async function getAccount(): Promise<string | null> {
  if (!checkWalletInstalled() || !window.ethereum || !window.ethereum.request) {
    throw new Error('Wallet not installed')
  }

  const ethereum = window.ethereum as { request: (args: { method: string; params?: any[] }) => Promise<any> }
  try {
    const accounts = await ethereum.request({ method: 'eth_accounts' })
    return accounts && accounts.length > 0 ? accounts[0] : null
  } catch (error) {
    console.error('Failed to get account:', error)
    return null
  }
}

/**
 * 请求连接钱包
 */
export async function requestAccount(): Promise<string | null> {
  if (!checkWalletInstalled() || !window.ethereum || !window.ethereum.request) {
    throw new Error('Wallet not installed')
  }

  const ethereum = window.ethereum as { request: (args: { method: string; params?: any[] }) => Promise<any> }
  try {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
    return accounts && accounts.length > 0 ? accounts[0] : null
  } catch (error) {
    console.error('Failed to request account:', error)
    throw error
  }
}

/**
 * 获取当前网络 ID
 */
export async function getNetworkId(): Promise<number> {
  if (!checkWalletInstalled() || !window.ethereum || !window.ethereum.request) {
    throw new Error('Wallet not installed')
  }

  const ethereum = window.ethereum as { request: (args: { method: string; params?: any[] }) => Promise<any> }
  try {
    const chainId = await ethereum.request({ method: 'eth_chainId' })
    return parseInt(chainId, 16)
  } catch (error) {
    console.error('Failed to get network ID:', error)
    throw error
  }
}

/**
 * 获取链信息
 */
export async function fetchChainInfo(): Promise<{ chainId: number; [key: string]: any }> {
  return apiGet('/swap/auth/network')
}

/**
 * 添加链到钱包
 */
export async function addChain(chainInfo: { chainId: number; chainName?: string; chainRpc?: string; symbol?: string; explorer?: string }): Promise<boolean> {
  if (!checkWalletInstalled() || !window.ethereum || !window.ethereum.request) {
    throw new Error('Wallet not installed')
  }

  const ethereum = window.ethereum as { request: (args: { method: string; params?: any[] }) => Promise<any> }
  try {
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${Number(chainInfo.chainId).toString(16)}`,
        chainName: chainInfo.chainName || 'BTY Network',
        rpcUrls: [chainInfo.chainRpc],
        nativeCurrency: {
          name: chainInfo.symbol || 'BTY',
          symbol: chainInfo.symbol || 'BTY',
          decimals: 18
        },
        blockExplorerUrls: chainInfo.explorer ? [chainInfo.explorer] : []
      }]
    })
    return true
  } catch (error: any) {
    // 某些钱包在添加成功后也会抛出 -32603 错误，忽略它
    if (error.code === -32603) {
      return true
    }
    throw error
  }
}

/**
 * 切换网络，如果网络不存在则添加
 */
export async function switchToNetwork(chainInfo: { chainId: number; chainName?: string; chainRpc?: string; symbol?: string; explorer?: string }): Promise<boolean> {
  if (!checkWalletInstalled() || !window.ethereum || !window.ethereum.request) {
    throw new Error('Wallet not installed')
  }

  const ethereum = window.ethereum as { request: (args: { method: string; params?: any[] }) => Promise<any> }
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${Number(chainInfo.chainId).toString(16)}` }]
    })
    return true
  } catch (error: any) {
    // 4902: 链不存在; -32603: 内部错误（某些钱包用这个表示链不存在）
    if (error.code === 4902 || error.code === -32603) {
      return addChain(chainInfo)
    }
    throw error
  }
}

/**
 * 检查钱包和网络
 */
export async function checkWallet(): Promise<void> {
  if (!checkWalletInstalled()) {
    throw new Error('Wallet not installed')
  }

  try {
    const ethNetwork = await getNetworkId()
    const chainInfo = await fetchChainInfo()
    const { chainId } = chainInfo
    if (Number(chainId) !== Number(ethNetwork)) {
      // 网络不匹配，自动切换网络
      await switchToNetwork(chainInfo)
    }

    // 更新链信息到本地存储（如果需要）
    // authUtil.chainInfo = chainInfo
  } catch (error) {
    console.error('Wallet check failed:', error)
    throw error
  }
}

/**
 * 获取用户数据（包含 nonce）
 */
export async function fetchUserData(account: string): Promise<{ nonce: string; [key: string]: any }> {
  return apiGet('/swap/auth/user', { publicAddress: account })
}

/**
 * 个人签名
 */
export async function personalSign(message: string): Promise<string> {
  if (!checkWalletInstalled() || !window.ethereum || !window.ethereum.request) {
    throw new Error('Wallet not installed')
  }

  const account = await getAccount()
  if (!account) {
    throw new Error('No account connected')
  }

  const ethereum = window.ethereum as { request: (args: { method: string; params?: any[] }) => Promise<any> }
  try {
    const signature = await ethereum.request({
      method: 'personal_sign',
      params: [message, account],
    })
    return signature
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the signature request')
    }
    throw error
  }
}

/**
 * 获取 nonce 并签名
 */
export async function getNonce(account: string): Promise<{ signature: string; nonce: string } | null> {
  try {
    const userData = await fetchUserData(account)
    if (!userData || !userData.nonce) {
      return null
    }

    const signature = await personalSign(userData.nonce)
    return {
      signature,
      nonce: userData.nonce,
    }
  } catch (error) {
    console.error('Failed to get nonce:', error)
    return null
  }
}

/**
 * 认证请求，获取 token
 */
export async function authRequest(
  account: string,
  signature: string,
  nonce: string,
  invitor?: string
): Promise<{ accessToken: string; userType?: string; [key: string]: any }> {
  return apiPost('/swap/auth/auth', {
    publicAddress: account,
    signature,
    nonce,
    invitor: invitor || '0'
  })
}

/**
 * 检查账户和网络是否变化
 */
export async function checkAccAndNet(): Promise<boolean> {
  const currentAccount = await getAccount()
  const authData = authUtil.getAuthData()

  // 检查账户是否变化
  if (authData && currentAccount && authData.account !== currentAccount) {
    console.error('Account changed:', authData.account, '->', currentAccount)
    return true
  }

  // 检查网络是否变化
  try {
    const ethNetwork = await getNetworkId()
    const chainInfo = await fetchChainInfo()
    const sysChainId = chainInfo.chainId

    if (sysChainId !== ethNetwork) {
      console.error('Network changed:', sysChainId, '->', ethNetwork)
      return true
    }
  } catch (error) {
    console.error('Failed to check network:', error)
    return true
  }

  // 检查用户是否存在
  if (authData && authData.account) {
    try {
      // 这里可以添加检查用户是否存在的 API 调用
      // const exists = await apiGet('/swap/auth/checkAddress', { address: authData.account })
      // if (!exists) {
      //   return true
      // }
    } catch (error) {
      console.error('Failed to check user:', error)
    }
  }

  return false
}

