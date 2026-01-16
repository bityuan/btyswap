/**
 * API 工具类，用于与服务端交互
 */

export const API_BASE_URL = 'http://121.52.224.91:3380'

export interface ApiResponse<T = any> {
  code?: number | string
  data?: T
  message?: string
  status?: string
  msg?: string
  [key: string]: any
}

/**
 * 发送 GET 请求
 */
export async function apiGet<T = any>(path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (params) {
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key])
    })
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data: ApiResponse<T> = await response.json()

  // 检查响应体中的 code 字段
  // 支持数字类型（200, 0）和字符串类型（"abc.suc.success"）
  if (data.code !== undefined) {
    const { code } = data
    const isSuccess = 
      (typeof code === 'number' && (code === 200 || code === 0)) ||
      (typeof code === 'string' && (code.includes('suc') || code.includes('success')))
    
    if (!isSuccess) {
      const errorMsg = data.msg || data.message || `API request failed with code ${code}`
      throw new Error(errorMsg)
    }
  }

  // 检查 status 字段（如果存在）
  if (data.status !== undefined && data.status !== 'OK' && data.status !== 'ok') {
    const errorMsg = data.msg || data.message || `API request failed with status ${data.status}`
    throw new Error(errorMsg)
  }

  // 检查 HTTP 状态码
  if (!response.ok) {
    const errorMsg = data.msg || data.message || `API request failed: ${response.statusText}`
    throw new Error(errorMsg)
  }

  return data.data || data as T
}

/**
 * 发送 POST 请求
 */
export async function apiPost<T = any>(path: string, body?: Record<string, any>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data: ApiResponse<T> = await response.json()

  // 检查响应体中的 code 字段
  // 支持数字类型（200, 0）和字符串类型（"abc.suc.success"）
  if (data.code !== undefined) {
    const { code } = data
    const isSuccess = 
      (typeof code === 'number' && (code === 200 || code === 0)) ||
      (typeof code === 'string' && (code.includes('suc') || code.includes('success')))
    
    if (!isSuccess) {
      const errorMsg = data.msg || data.message || `API request failed with code ${code}`
      throw new Error(errorMsg)
    }
  }

  // 检查 status 字段（如果存在）
  if (data.status !== undefined && data.status !== 'OK' && data.status !== 'ok') {
    const errorMsg = data.msg || data.message || `API request failed with status ${data.status}`
    throw new Error(errorMsg)
  }

  // 检查 HTTP 状态码
  if (!response.ok) {
    const errorMsg = data.msg || data.message || `API request failed: ${response.statusText}`
    throw new Error(errorMsg)
  }

  return data.data || data as T
}

/**
 * 发送带 Token 的请求
 */
export async function apiGetWithAuth<T = any>(
  path: string,
  token: string,
  params?: Record<string, any>
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (params) {
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key])
    })
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
  })

  const data: ApiResponse<T> = await response.json()

  // 检查响应体中的 code 字段
  // 支持数字类型（200, 0）和字符串类型（"abc.suc.success"）
  if (data.code !== undefined) {
    const { code } = data
    const isSuccess = 
      (typeof code === 'number' && (code === 200 || code === 0)) ||
      (typeof code === 'string' && (code.includes('suc') || code.includes('success')))
    
    if (!isSuccess) {
      const errorMsg = data.msg || data.message || `API request failed with code ${code}`
      throw new Error(errorMsg)
    }
  }

  // 检查 status 字段（如果存在）
  if (data.status !== undefined && data.status !== 'OK' && data.status !== 'ok') {
    const errorMsg = data.msg || data.message || `API request failed with status ${data.status}`
    throw new Error(errorMsg)
  }

  // 检查 HTTP 状态码
  if (!response.ok) {
    const errorMsg = data.msg || data.message || `API request failed: ${response.statusText}`
    throw new Error(errorMsg)
  }

  return data.data || data as T
}

/**
 * 发送带 Token 的 POST 请求
 */
export async function apiPostWithAuth<T = any>(
  path: string,
  token: string,
  body?: Record<string, any>
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data: ApiResponse<T> = await response.json()

  // 检查响应体中的 code 字段
  // 支持数字类型（200, 0）和字符串类型（"abc.suc.success"）
  if (data.code !== undefined) {
    const { code } = data
    const isSuccess = 
      (typeof code === 'number' && (code === 200 || code === 0)) ||
      (typeof code === 'string' && (code.includes('suc') || code.includes('success')))
    
    if (!isSuccess) {
      const errorMsg = data.msg || data.message || `API request failed with code ${code}`
      throw new Error(errorMsg)
    }
  }

  // 检查 status 字段（如果存在）
  if (data.status !== undefined && data.status !== 'OK' && data.status !== 'ok') {
    const errorMsg = data.msg || data.message || `API request failed with status ${data.status}`
    throw new Error(errorMsg)
  }

  // 检查 HTTP 状态码
  if (!response.ok) {
    const errorMsg = data.msg || data.message || `API request failed: ${response.statusText}`
    throw new Error(errorMsg)
  }

  return data.data || data as T
}

/**
 * 获取图片（返回 Blob URL）
 */
export async function apiGetImage(path: string, params?: Record<string, any>): Promise<string> {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (params) {
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key])
    })
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Image request failed: ${response.statusText}`)
  }

  // 将响应转换为 Blob
  const blob = await response.blob()
  // 创建 Blob URL
  return URL.createObjectURL(blob)
}

