import React from 'react'
import styled from 'styled-components'
import { Link as HistoryLink } from 'react-router-dom'
import { ArrowLeft } from 'react-feather'
import { RowBetween } from 'components/Row'
import QuestionHelper from 'components/QuestionHelper'
import { useTranslation } from 'react-i18next'

const Tabs = styled.div`
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  border-radius: 3rem;
  justify-content: space-evenly;
`

const ActiveText = styled.div`
  font-weight: 500;
  font-size: 20px;
`

const StyledArrowLeft = styled(ArrowLeft)`
  color: ${({ theme }) => theme.colors.text};
`

export function FindPoolTabs() {
  const { t } = useTranslation()
  return (
    <Tabs>
      <RowBetween style={{ padding: '1rem' }}>
        <HistoryLink to="/pool">
          <StyledArrowLeft />
        </HistoryLink>
        <ActiveText>Import Pool</ActiveText>
        <QuestionHelper
          text={t('useToolFindPairs')}
        />
      </RowBetween>
    </Tabs>
  )
}

export function AddRemoveTabs({ adding }: { adding: boolean }) {
  const { t } = useTranslation()
  return (
    <Tabs>
      <RowBetween style={{ padding: '1rem' }}>
        <HistoryLink to="/pool">
          <StyledArrowLeft />
        </HistoryLink>
        <ActiveText>{adding ? t('add') : t('remove')} Liquidity</ActiveText>
        <QuestionHelper
          text={
            adding
              ? t('whenAddLiquidityGivenTokens')
              : t('removingPoolTokensConverts')
          }
        />
      </RowBetween>
    </Tabs>
  )
}
