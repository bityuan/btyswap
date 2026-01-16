import { Currency, ETHER } from '@pancakeswap-libs/sdk'

export default function useTokenSymbol() {
  const getTokenSymbol = (currency: Currency | undefined, chainId?: number) => {
    return currency === ETHER && chainId === 2999 ? 'BTY' : currency?.symbol
  }
  
  return { getTokenSymbol }
}
