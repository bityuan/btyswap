export const DEFAULT_TOKEN_LIST_URL = 'pancakeswap'

// 自定义Token List（放在public目录，打包后在根目录）
export const CUSTOM_TOKEN_LIST_URL = '/token-list.json'

// 默认列表：先加载自定义列表，再加载默认列表
export const DEFAULT_LIST_OF_LISTS: string[] = [
  CUSTOM_TOKEN_LIST_URL,
  DEFAULT_TOKEN_LIST_URL
]
