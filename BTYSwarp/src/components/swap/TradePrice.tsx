import React from 'react'
import { Price } from '@btyswap-libs/sdk'
import { SyncAltIcon, Text } from '@pancakeswap-libs/uikit'
import { useActiveWeb3React } from 'hooks'
import useTokenSymbol from 'hooks/useTokenSymbol'
import { StyledBalanceMaxMini } from './styleds'

interface TradePriceProps {
  price?: Price
  showInverted: boolean
  setShowInverted: (showInverted: boolean) => void
}

export default function TradePrice({ price, showInverted, setShowInverted }: TradePriceProps) {
  const { getTokenSymbol } = useTokenSymbol()
  const { chainId } = useActiveWeb3React()
  
  const formattedPrice = showInverted ? price?.toSignificant(6) : price?.invert()?.toSignificant(6)

  const show = Boolean(price?.baseCurrency && price?.quoteCurrency)
  const label = showInverted
    ? `${getTokenSymbol(price?.quoteCurrency, chainId)} per ${getTokenSymbol(price?.baseCurrency, chainId)}`
    : `${getTokenSymbol(price?.baseCurrency, chainId)} per ${getTokenSymbol(price?.quoteCurrency, chainId)}`

  return (
    <Text fontSize="14px" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
      {show ? (
        <>
          {formattedPrice ?? '-'} {label}
          <StyledBalanceMaxMini onClick={() => setShowInverted(!showInverted)}>
            <SyncAltIcon width="20px" color="primary" />
          </StyledBalanceMaxMini>
        </>
      ) : (
        '-'
      )}
    </Text>
  )
}
