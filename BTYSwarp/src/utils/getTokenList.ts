import { TokenList } from '@uniswap/token-lists'
import schema from '@uniswap/token-lists/src/tokenlist.schema.json'
import Ajv from 'ajv'
import contenthashToUri from './contenthashToUri'
import { parseENSAddress } from './parseENSAddress'
import uriToHttp from './uriToHttp'

// bakeryswap defaultTokenJson
import { DEFAULT_TOKEN_LIST_URL } from '../constants/lists'
import defaultTokenJson from '../constants/token/pancakeswap.json'

const tokenListValidator = new Ajv({ allErrors: true }).compile(schema)

/**
 * Contains the logic for resolving a list URL to a validated token list
 * @param listUrl list url
 * @param resolveENSContentHash resolves an ens name to a contenthash
 */
export default async function getTokenList(
  listUrl: string,
  resolveENSContentHash: (ensName: string) => Promise<string>
): Promise<TokenList> {
  // 本地默认列表
  if (listUrl === DEFAULT_TOKEN_LIST_URL) {
    return defaultTokenJson
  }
  
  // 处理相对路径的JSON文件（如 /token-list.json）
  // 这些文件在public目录，打包后在build根目录
  if (listUrl.startsWith('/') && listUrl.endsWith('.json')) {
    try {
      const response = await fetch(listUrl)
      if (!response.ok) {
        // 如果文件不存在，抛出错误（会被上层处理，不影响其他列表）
        throw new Error(`Token list not found: ${listUrl}`)
      }
      const json = await response.json()
      
      // 将相对路径的 logoURI 转换为完整 URI
      // 获取当前域名，用于构建完整的 URI
      const baseUrl = window.location.origin
      
      // 处理根级别的 logoURI
      if (json.logoURI && json.logoURI.startsWith('/')) {
        json.logoURI = `${baseUrl}${json.logoURI}`
      } else if (!json.logoURI || json.logoURI === '') {
        // 如果为空，使用默认值
        json.logoURI = `${baseUrl}/images/logo.png`
      }
      
      // 处理 tokens 中的 logoURI
      if (json.tokens && Array.isArray(json.tokens)) {
        json.tokens = json.tokens.map((token: any) => {
          if (token.logoURI && token.logoURI.startsWith('/')) {
            token.logoURI = `${baseUrl}${token.logoURI}`
          }
          return token
        })
      }
      
      if (!tokenListValidator(json)) {
        const validationErrors: string =
          tokenListValidator.errors?.reduce<string>((memo, error) => {
            const add = `${error.dataPath} ${error.message ?? ''}`
            return memo.length > 0 ? `${memo}; ${add}` : `${add}`
          }, '') ?? 'unknown error'
        throw new Error(`Token list failed validation: ${validationErrors}`)
      }
      return json
    } catch (error) {
      // 如果加载失败，抛出错误（会被上层处理，静默失败不影响其他列表）
      console.error(`Failed to load token list from ${listUrl}:`, error)
      throw error
    }
  }
  
  // 原有的URL加载逻辑（HTTP/HTTPS/IPFS/ENS）
  const parsedENS = parseENSAddress(listUrl)

  let urls: string[]
  if (parsedENS) {
    let contentHashUri
    try {
      contentHashUri = await resolveENSContentHash(parsedENS.ensName)
    } catch (error) {
      console.error(`Failed to resolve ENS name: ${parsedENS.ensName}`, error)
      throw new Error(`Failed to resolve ENS name: ${parsedENS.ensName}`)
    }
    let translatedUri
    try {
      translatedUri = contenthashToUri(contentHashUri)
    } catch (error) {
      console.error('Failed to translate contenthash to URI', contentHashUri)
      throw new Error(`Failed to translate contenthash to URI: ${contentHashUri}`)
    }
    urls = uriToHttp(`${translatedUri}${parsedENS.ensPath ?? ''}`)
  } else {
    urls = uriToHttp(listUrl)
  }
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const isLast = i === urls.length - 1
    let response
    try {
      response = await fetch(url)
    } catch (error) {
      console.error('Failed to fetch list', listUrl, error)
      if (isLast) throw new Error(`Failed to download list ${listUrl}`)
      // eslint-disable-next-line no-continue
      continue
    }

    if (!response.ok) {
      if (isLast) throw new Error(`Failed to download list ${listUrl}`)
      // eslint-disable-next-line no-continue
      continue
    }

    const json = await response.json()
    if (!tokenListValidator(json)) {
      const validationErrors: string =
        tokenListValidator.errors?.reduce<string>((memo, error) => {
          const add = `${error.dataPath} ${error.message ?? ''}`
          return memo.length > 0 ? `${memo}; ${add}` : `${add}`
        }, '') ?? 'unknown error'
      throw new Error(`Token list failed validation: ${validationErrors}`)
    }
    return json
  }
  throw new Error('Unrecognized list URL protocol.')
}
