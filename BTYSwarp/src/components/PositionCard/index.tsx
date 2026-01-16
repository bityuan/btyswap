import React, { useState } from 'react'
import { Button, Card as UIKitCard, CardBody, Text } from '@pancakeswap-libs/uikit'
import { darken } from 'polished'
import { ChevronDown, ChevronUp, Copy } from 'react-feather'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { JSBI, Pair, Percent } from '@pancakeswap-libs/sdk'
import { useTotalSupply } from '../../data/TotalSupply'

import { useActiveWeb3React } from '../../hooks'
import { useTokenBalance } from '../../state/wallet/hooks'
import { currencyId } from '../../utils/currencyId'
import { unwrappedToken } from '../../utils/wrappedCurrency'
import Card from '../Card'
import { AutoColumn } from '../Column'
import CurrencyLogo from '../CurrencyLogo'
import DoubleCurrencyLogo from '../DoubleLogo'
import { RowBetween, RowFixed } from '../Row'
import { Dots } from '../swap/styleds'

export const FixedHeightRow = styled(RowBetween)`
  height: 24px;
`

export const HoverCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.colors.invertedContrast};
  :hover {
    border: 1px solid ${({ theme }) => darken(0.06, theme.colors.invertedContrast)};
  }
`

const CopyButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textSubtle};
  transition: opacity 0.2s;
  margin-left: 8px;
  
  &:hover {
    opacity: 0.7;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`

interface PositionCardProps {
  pair: Pair
  // eslint-disable-next-line react/no-unused-prop-types
  showUnwrapped?: boolean
  // eslint-disable-next-line react/no-unused-prop-types
  removeOnly?: boolean
}

export function MinimalPositionCard({ pair, showUnwrapped = false }: PositionCardProps) {
  const { account } = useActiveWeb3React()

  const currency0 = showUnwrapped ? pair.token0 : unwrappedToken(pair.token0)
  const currency1 = showUnwrapped ? pair.token1 : unwrappedToken(pair.token1)

  const [showMore, setShowMore] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const userPoolBalance = useTokenBalance(account ?? undefined, pair.liquidityToken)
  const totalPoolTokens = useTotalSupply(pair.liquidityToken)

  // 格式化地址显示：前4位...后6位
  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 4)}...${address.slice(-6)}`
  }

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        if (successful) {
          setCopySuccess(true)
          setTimeout(() => setCopySuccess(false), 2000)
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyAddress = () => {
    if (pair.liquidityToken.address) {
      copyToClipboard(pair.liquidityToken.address)
    }
  }

  const [token0Deposited, token1Deposited] =
    !!pair &&
    !!totalPoolTokens &&
    !!userPoolBalance &&
    // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
    JSBI.greaterThanOrEqual(totalPoolTokens.raw, userPoolBalance.raw)
      ? [
          pair.getLiquidityValue(pair.token0, totalPoolTokens, userPoolBalance, false),
          pair.getLiquidityValue(pair.token1, totalPoolTokens, userPoolBalance, false),
        ]
      : [undefined, undefined]

  return (
    <>
      {userPoolBalance && (
        <UIKitCard>
          <CardBody>
            <AutoColumn gap="12px">
              <FixedHeightRow>
                <RowFixed>
                  <Text style={{ textTransform: 'uppercase', fontWeight: 600 }} fontSize="14px" color="textSubtle">
                    LP Tokens in your Wallet
                  </Text>
                </RowFixed>
              </FixedHeightRow>
              <FixedHeightRow onClick={() => setShowMore(!showMore)}>
                <RowFixed>
                  <DoubleCurrencyLogo currency0={currency0} currency1={currency1} margin size={20} />
                  <Text fontSize="14px">
                    {currency0.symbol}/{currency1.symbol}
                  </Text>
                </RowFixed>
                <RowFixed>
                  <Text fontSize="14px">{userPoolBalance ? userPoolBalance.toSignificant(4) : '-'}</Text>
                </RowFixed>
              </FixedHeightRow>
              <AutoColumn gap="4px">
                <FixedHeightRow>
                  <Text fontSize="14px">{currency0.symbol}:</Text>
                  {token0Deposited ? (
                    <RowFixed>
                      <Text ml="6px" fontSize="14px">
                        {token0Deposited?.toSignificant(6)}
                      </Text>
                    </RowFixed>
                  ) : (
                    '-'
                  )}
                </FixedHeightRow>
                <FixedHeightRow>
                  <Text fontSize="14px">{currency1.symbol}:</Text>
                  {token1Deposited ? (
                    <RowFixed>
                      <Text ml="6px" fontSize="14px">
                        {token1Deposited?.toSignificant(6)}
                      </Text>
                    </RowFixed>
                  ) : (
                    '-'
                  )}
                </FixedHeightRow>
                <FixedHeightRow>
                  <Text fontSize="14px">LP Contract:</Text>
                  <RowFixed>
                    <Text fontSize="14px" ml="6px">
                      {formatAddress(pair.liquidityToken.address)}
                    </Text>
                    <CopyButton onClick={handleCopyAddress} title="复制LP合约地址">
                      <Copy size={14} />
                    </CopyButton>
                    {copySuccess && (
                      <Text fontSize="12px" color="success" ml="4px">
                        已复制
                      </Text>
                    )}
                  </RowFixed>
                </FixedHeightRow>
              </AutoColumn>
            </AutoColumn>
          </CardBody>
        </UIKitCard>
      )}
    </>
  )
}

export default function FullPositionCard({ pair, removeOnly }: PositionCardProps) {
  const { account } = useActiveWeb3React()

  const currency0 = unwrappedToken(pair.token0)
  const currency1 = unwrappedToken(pair.token1)

  const [showMore, setShowMore] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const userPoolBalance = useTokenBalance(account ?? undefined, pair.liquidityToken)
  const totalPoolTokens = useTotalSupply(pair.liquidityToken)

  // 格式化地址显示：前4位...后4位
  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        if (successful) {
          setCopySuccess(true)
          setTimeout(() => setCopySuccess(false), 2000)
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyAddress = () => {
    if (pair.liquidityToken.address) {
      copyToClipboard(pair.liquidityToken.address)
    }
  }

  const poolTokenPercentage =
    !!userPoolBalance && !!totalPoolTokens && JSBI.greaterThanOrEqual(totalPoolTokens.raw, userPoolBalance.raw)
      ? new Percent(userPoolBalance.raw, totalPoolTokens.raw)
      : undefined

  const [token0Deposited, token1Deposited] =
    !!pair &&
    !!totalPoolTokens &&
    !!userPoolBalance &&
    // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
    JSBI.greaterThanOrEqual(totalPoolTokens.raw, userPoolBalance.raw)
      ? [
          pair.getLiquidityValue(pair.token0, totalPoolTokens, userPoolBalance, false),
          pair.getLiquidityValue(pair.token1, totalPoolTokens, userPoolBalance, false),
        ]
      : [undefined, undefined]

  return (
    <HoverCard>
      <AutoColumn gap="12px">
        <FixedHeightRow onClick={() => setShowMore(!showMore)} style={{ cursor: 'pointer' }}>
          <RowFixed>
            <DoubleCurrencyLogo currency0={currency0} currency1={currency1} margin size={20} />
            <Text>{!currency0 || !currency1 ? <Dots>Loading</Dots> : `${currency0.symbol}/${currency1.symbol}`}</Text>
          </RowFixed>
          <RowFixed>
            {showMore ? (
              <ChevronUp size="20" style={{ marginLeft: '10px' }} />
            ) : (
              <ChevronDown size="20" style={{ marginLeft: '10px' }} />
            )}
          </RowFixed>
        </FixedHeightRow>
        {showMore && (
          <AutoColumn gap="8px">
            <FixedHeightRow>
              <RowFixed>
                <Text>Pooled {currency0.symbol}:</Text>
              </RowFixed>
              {token0Deposited ? (
                <RowFixed>
                  <Text ml="6px">{token0Deposited?.toSignificant(6)}</Text>
                  <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={currency0} />
                </RowFixed>
              ) : (
                '-'
              )}
            </FixedHeightRow>

            <FixedHeightRow>
              <RowFixed>
                <Text>Pooled {currency1.symbol}:</Text>
              </RowFixed>
              {token1Deposited ? (
                <RowFixed>
                  <Text ml="6px">{token1Deposited?.toSignificant(6)}</Text>
                  <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={currency1} />
                </RowFixed>
              ) : (
                '-'
              )}
            </FixedHeightRow>
            <FixedHeightRow>
              <Text>Your pool tokens:</Text>
              <Text>{userPoolBalance ? userPoolBalance.toSignificant(4) : '-'}</Text>
            </FixedHeightRow>
            <FixedHeightRow>
              <Text>Your pool share:</Text>
              <Text>{poolTokenPercentage ? `${poolTokenPercentage.toFixed(2)}%` : '-'}</Text>
            </FixedHeightRow>
            <FixedHeightRow>
              <Text>LP Contract:</Text>
              <RowFixed>
                <Text ml="6px">
                  {formatAddress(pair.liquidityToken.address)}
                </Text>
                <CopyButton onClick={handleCopyAddress} title="复制LP合约地址">
                  <Copy size={14} />
                </CopyButton>
                {copySuccess && (
                  <Text fontSize="12px" color="success" ml="4px">
                    已复制
                  </Text>
                )}
              </RowFixed>
            </FixedHeightRow>

            <RowBetween marginTop="10px">
              {removeOnly && (
                <Button
                  as={Link}
                  to={`/add/${currencyId(currency0)}/${currencyId(currency1)}`}
                  style={{ width: '48%' }}
                >
                  Add
                </Button>
              )}
              <Button
                as={Link}
                style={{ width: '48%' }}
                to={`/remove/${currencyId(currency0)}/${currencyId(currency1)}`}
              >
                Remove
              </Button>
            </RowBetween>
          </AutoColumn>
        )}
      </AutoColumn>
    </HoverCard>
  )
}
