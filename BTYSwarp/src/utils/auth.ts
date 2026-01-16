/**
 * 认证工具类，用于管理登录状态和token
 */

const AUTH_STORAGE_KEY = 'bty_auth'
const USER_STORAGE_KEY = 'bty_user'

export interface AuthData {
  accessToken: string
  userType?: string
  account: string
  chainId: number
}

export interface UserData {
  nonce: string
  [key: string]: any
}

class AuthUtil {
  private authData: AuthData | null = null

  private user: string | null = null

  constructor() {
    this.loadFromStorage()
  }

  /**
   * 从 localStorage 加载数据
   */
  private loadFromStorage() {
    try {
      const authStr = localStorage.getItem(AUTH_STORAGE_KEY)
      const userStr = localStorage.getItem(USER_STORAGE_KEY)
      
      if (authStr) {
        this.authData = JSON.parse(authStr)
        this.user = this.authData?.account || null
      }
      
      if (userStr) {
        this.user = userStr
      }
    } catch (error) {
      console.error('Failed to load auth data from storage:', error)
    }
  }

  /**
   * 保存到 localStorage
   */
  private saveToStorage() {
    try {
      if (this.authData) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.authData))
      }
      if (this.user) {
        localStorage.setItem(USER_STORAGE_KEY, this.user)
      }
    } catch (error) {
      console.error('Failed to save auth data to storage:', error)
    }
  }

  /**
   * 登录
   */
  login(account: string, accessToken: string, userType?: string, chainId?: number) {
    this.authData = {
      accessToken,
      userType,
      account,
      chainId: chainId || 2999,
    }
    this.user = account
    this.saveToStorage()
  }

  /**
   * 登出
   */
  logout() {
    this.authData = null
    this.user = null
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
  }

  /**
   * 检查是否已登录
   */
  isLogged(): boolean {
    return !!this.authData && !!this.authData.accessToken
  }

  /**
   * 获取 token
   */
  getToken(): string | null {
    return this.authData?.accessToken || null
  }

  /**
   * 获取当前用户地址
   */
  getUser(): string | null {
    return this.user
  }

  /**
   * 获取认证数据
   */
  getAuthData(): AuthData | null {
    return this.authData
  }

  /**
   * 更新用户地址
   */
  updateUser(account: string) {
    this.user = account
    if (this.authData) {
      this.authData.account = account
      this.saveToStorage()
    }
  }
}

// 单例
export const authUtil = new AuthUtil()

