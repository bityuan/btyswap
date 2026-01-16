import { ChainId, JSBI, Percent, Token, WETH } from '@pancakeswap-libs/sdk'
// TODO: BTY正式链
export const ROUTER_ADDRESS = '0xb7230033d833d2cB6AA801E857c74465B4AcF272'
// TODO: BTY测试链
// export const ROUTER_ADDRESS = '0x5303511A6a32d01BF7B42C04018e087ab9303363'

// BTY 私有链前端配置（SDK中已包含代币和合约地址配置）
export const PRIVATE_CHAIN_CONFIG = {
  chainId: ChainId.MAINNET,
  chainName: 'BTY Chain',
  nativeCurrency: {
    name: 'BTY',
    symbol: 'BTY',
    decimals: 18,
  },
  rpcUrls: ['https://mainnet.bityuan.com/eth'],
  blockExplorerUrls: ['https://mainnet.bityuan.com/'],
  multicallAddress: '0x1Eb26f8eef1a433b241bE8Aa60bFe6408EC8Ac8D',
  routerAddress: '0xb7230033d833d2cB6AA801E857c74465B4AcF272',
} as const

// 直接使用 SDK 中的 WETH[ChainId.MAINNET] 作为 WBTY
// SDK 中 ChainId.MAINNET = 2999，WETH[ChainId.MAINNET] 已经是 WBTY
export const WBTY = WETH[ChainId.MAINNET]

// BTY 原生代币（用于某些场景需要 Token 类型）
export const BTY = new Token(
  ChainId.MAINNET,
  '0x0000000000000000000000000000000000000000',
  18,
  'BTY',
  'BTY Token'
)

// a list of tokens by chain
type ChainTokenList = {
  readonly [chainId in ChainId]: Token[]
}

// 私有链2999只支持BTY和WBTY
const WETH_ONLY: ChainTokenList = {
  [ChainId.MAINNET]: [WETH[ChainId.MAINNET]],
  [ChainId.BSCTESTNET]: [WETH[ChainId.BSCTESTNET]],
  // [PRIVATE_CHAIN_ID]: [WBTY], // 私有链使用WBTY替代WETH
}

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET]], // BSC主网保持原有逻辑
  // [PRIVATE_CHAIN_ID]: [...WETH_ONLY[PRIVATE_CHAIN_ID], BTY, ELFT], // 私有链使用BTY和ELFT
}

/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 */
export const CUSTOM_BASES: { [chainId in ChainId]?: { [tokenAddress: string]: Token[] } } = {
  [ChainId.MAINNET]: {},
  // [PRIVATE_CHAIN_ID]: {},
}

// used for display in the default list when adding liquidity
export const SUGGESTED_BASES: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET]], // BSC主网保持原有逻辑
  // [PRIVATE_CHAIN_ID]: [...WETH_ONLY[PRIVATE_CHAIN_ID], BTY, ELFT], // 私有链使用BTY和ELFT
}

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET]], // BSC主网保持原有逻辑
  // [PRIVATE_CHAIN_ID]: [...WETH_ONLY[PRIVATE_CHAIN_ID], BTY, ELFT], // 私有链使用BTY和ELFT
}

export const PINNED_PAIRS: { readonly [chainId in ChainId]?: [Token, Token][] } = {
  [ChainId.MAINNET]: [], // BSC主网暂时不设置固定交易对
  // [PRIVATE_CHAIN_ID]: [
  //   [BTY, WBTY], // 私有链BTY/WBTY交易对
  //   [BTY, ELFT], // 私有链BTY/ELFT交易对
  //   [WBTY, ELFT], // 私有链WBTY/ELFT交易对
  // ],
}

export const NetworkContextName = 'NETWORK'

// default allowed slippage, in bips
export const INITIAL_ALLOWED_SLIPPAGE = 80
// 20 minutes, denominated in seconds
export const DEFAULT_DEADLINE_FROM_NOW = 60 * 20

// one basis point
export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000))
export const BIPS_BASE = JSBI.BigInt(10000)
// used for warning states
export const ALLOWED_PRICE_IMPACT_LOW: Percent = new Percent(JSBI.BigInt(100), BIPS_BASE) // 1%
export const ALLOWED_PRICE_IMPACT_MEDIUM: Percent = new Percent(JSBI.BigInt(300), BIPS_BASE) // 3%
export const ALLOWED_PRICE_IMPACT_HIGH: Percent = new Percent(JSBI.BigInt(500), BIPS_BASE) // 5%
// if the price slippage exceeds this number, force the user to type 'confirm' to execute
export const PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN: Percent = new Percent(JSBI.BigInt(1000), BIPS_BASE) // 10%
// for non expert mode disable swaps above this
export const BLOCKED_PRICE_IMPACT_NON_EXPERT: Percent = new Percent(JSBI.BigInt(1500), BIPS_BASE) // 15%

// used to ensure the user doesn't send so much ETH so they end up with <.01
export const MIN_ETH: JSBI = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(16)) // .01 ETH
