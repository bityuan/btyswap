import React, { useContext, useMemo } from 'react'
import { ThemeContext } from 'styled-components'
import { Button, CardBody, Text } from '@pancakeswap-libs/uikit'
import { useHistory } from 'react-router-dom'
import Question from 'components/QuestionHelper'
import FullPositionCard from 'components/PositionCard'
import { useTokenBalancesWithLoadingIndicator } from 'state/wallet/hooks'
// import { StyledInternalLink } from 'components/Shared'
import { LightCard } from 'components/Card'
import { RowBetween } from 'components/Row'
import { AutoColumn } from 'components/Column'
import Container from 'components/Container'

import { useActiveWeb3React } from 'hooks'
import { usePairs } from 'data/Reserves'
import { toV2LiquidityToken, useTrackedTokenPairs } from 'state/user/hooks'
import { useUserLpTokens } from 'hooks/useUserLpTokens'
import { Dots } from 'components/swap/styleds'
import { useTranslation } from 'react-i18next'
import PageHeader from 'components/PageHeader'
import { Pair } from '@btyswap-libs/sdk'
import AppBody from '../AppBody'

export default function Pool() {
  const theme = useContext(ThemeContext)
  const { account } = useActiveWeb3React()
  const { t } = useTranslation()
  const history = useHistory()

  // Use the new hook to fetch all LP tokens from factory contract
  const { lpTokens: userLpTokens, loading: userLpTokensLoading } = useUserLpTokens()

  // Also fetch the user's balances of all tracked V2 LP tokens (as fallback/complement)
  const trackedTokenPairs = useTrackedTokenPairs()
  const tokenPairsWithLiquidityTokens = useMemo(
    () => trackedTokenPairs.map((tokens) => ({ liquidityToken: toV2LiquidityToken(tokens), tokens })),
    [trackedTokenPairs]
  )
  const liquidityTokens = useMemo(() => tokenPairsWithLiquidityTokens.map((tpwlt) => tpwlt.liquidityToken), [
    tokenPairsWithLiquidityTokens,
  ])
  const [v2PairsBalances, fetchingV2PairBalances] = useTokenBalancesWithLoadingIndicator(
    account ?? undefined,
    liquidityTokens
  )

  // fetch the reserves for all V2 pools in which the user has a balance
  const liquidityTokensWithBalances = useMemo(
    () =>
      tokenPairsWithLiquidityTokens.filter(({ liquidityToken }) =>
        v2PairsBalances[liquidityToken.address]?.greaterThan('0')
      ),
    [tokenPairsWithLiquidityTokens, v2PairsBalances]
  )

  const v2Pairs = usePairs(liquidityTokensWithBalances.map(({ tokens }) => tokens))
  const v2IsLoading =
    fetchingV2PairBalances || v2Pairs?.length < liquidityTokensWithBalances.length || v2Pairs?.some((V2Pair) => !V2Pair)

  // Combine pairs from both sources (factory query and tracked pairs)
  // Deduplicate by LP token address and filter out pairs with zero balance
  const allV2PairsWithLiquidity = useMemo(() => {
    const pairsMap = new Map<string, Pair>()

    // Add pairs from factory query (userLpTokens)
    // These already have balance > 0 filter in useUserLpTokens
    userLpTokens.forEach(({ pair }) => {
      const lpAddress = pair.liquidityToken.address.toLowerCase()
      if (!pairsMap.has(lpAddress)) {
        pairsMap.set(lpAddress, pair)
      }
    })

    // Add pairs from tracked pairs, but only if user has balance > 0
    const trackedPairs = v2Pairs
      .map(([, pair]) => pair)
      .filter((v2Pair): v2Pair is Pair => {
        if (!v2Pair) return false
        // Check if user has balance > 0 for this LP token
        const balance = v2PairsBalances[v2Pair.liquidityToken.address]
        return balance?.greaterThan('0') ?? false
      })
    
    trackedPairs.forEach((pair) => {
      const lpAddress = pair.liquidityToken.address.toLowerCase()
      if (!pairsMap.has(lpAddress)) {
        pairsMap.set(lpAddress, pair)
      }
    })

    // Final filter: only return pairs where:
    // 1. User has LP token balance > 0 (already filtered above)
    // 2. Pair has reserves > 0 (to avoid showing empty pools)
    return Array.from(pairsMap.values()).filter((pair) => {
      // Check if pair has any reserves (liquidity)
      const hasReserves = pair.reserve0.greaterThan('0') || pair.reserve1.greaterThan('0')
      if (!hasReserves) return false
      
      // Double-check user balance for tracked pairs
      const balance = v2PairsBalances[pair.liquidityToken.address]
      if (balance && !balance.greaterThan('0')) return false
      
      // Check if this pair is in userLpTokens (which already has balance > 0)
      const isInUserLpTokens = userLpTokens.some(
        ({ pair: userPair }) => userPair.liquidityToken.address.toLowerCase() === pair.liquidityToken.address.toLowerCase()
      )
      
      return isInUserLpTokens || (balance?.greaterThan('0') ?? false)
    })
  }, [userLpTokens, v2Pairs, v2PairsBalances])

  // Combined loading state
  const isLoading = userLpTokensLoading || v2IsLoading

  return (
    <Container>
      <AppBody>
        <PageHeader
          title={t('liquidity')}
          description={t('addLiquidityToReceiveLP')} showSettings={false}
        >
          <Button
            id="join-pool-button"
            onClick={() => history.push('/add')}
            mb="16px"
          >
            {t('addLiquidity')}
          </Button>
        </PageHeader>
        <AutoColumn gap="lg" justify="center">
          <CardBody>
            <AutoColumn gap="12px" style={{ width: '100%' }}>
              <RowBetween padding="0 8px">
                <Text color={theme.colors.text}>{t('yourLiquidity')}</Text>
                <Question
                  text={t('whenAddLiquidityGivenPoolTokens')}
                />
              </RowBetween>

              {!account ? (
                <LightCard padding="40px">
                  <Text color="textDisabled" textAlign="center">
                    {t('connectWalletViewLiquidity')}
                  </Text>
                </LightCard>
              ) : isLoading ? (
                <LightCard padding="40px">
                  <Text color="textDisabled" textAlign="center">
                    <Dots>Loading</Dots>
                  </Text>
                </LightCard>
              ) : allV2PairsWithLiquidity?.length > 0 ? (
                <>
                  {allV2PairsWithLiquidity.map((v2Pair) => (
                    <FullPositionCard key={v2Pair.liquidityToken.address} pair={v2Pair} />
                  ))}
                </>
              ) : (
                <LightCard padding="40px">
                  <Text color="textDisabled" textAlign="center">
                    {t('noLiquidityFound')}
                  </Text>
                </LightCard>
              )}

              {/* <div>
                <Text fontSize="14px" style={{ padding: '.5rem 0 .5rem 0' }}>
                  {t('dontSeePoolJoined')}{' '}
                  <StyledInternalLink id="import-pool-link" to="/find">
                    {t('importIt')}
                  </StyledInternalLink>
                </Text>
                <Text fontSize="14px" style={{ padding: '.5rem 0 .5rem 0' }}>
                  {t('orIfStakedLPUnstake')}
                </Text>
              </div> */}
            </AutoColumn>
          </CardBody>
        </AutoColumn>
      </AppBody>
    </Container>
  )
}
