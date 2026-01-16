import { Currency, ETHER, Token } from '@pancakeswap-libs/sdk'

export function currencyId(currency: Currency): string {
  if (currency === ETHER) return 'BTY'
  if (currency instanceof Token) return currency.address
  throw new Error('invalid currency')
}

// 私有链2999专用的currencyId函数
export function currencyIdForChain(currency: Currency, chainId?: number): string {
  if (currency === ETHER) {
    if (chainId === 2999) {
      return 'BTY'
    }
    return 'BNB'
  }
  if (currency instanceof Token) return currency.address
  throw new Error('invalid currency')
}

export default currencyId
