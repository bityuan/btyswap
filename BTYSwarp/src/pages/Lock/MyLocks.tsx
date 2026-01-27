import React from 'react'
import { useTranslation } from 'react-i18next'
import { CardBody, Text } from '@pancakeswap-libs/uikit'
import { AutoColumn } from 'components/Column'
import { LightCard } from 'components/Card'
import { useActiveWeb3React } from 'hooks'

export default function MyLocks() {
  const { t } = useTranslation()
  const { account } = useActiveWeb3React()

  return (
    <CardBody>
      <AutoColumn gap="20px">
        <Text fontSize="24px" bold mb="10px">
          {t('myLocks')}
        </Text>
        {!account ? (
          <LightCard padding="40px">
            <Text color="textDisabled" textAlign="center">
              {t('connectWalletViewLocks')}
            </Text>
          </LightCard>
        ) : (
          <LightCard padding="40px">
            <Text color="textDisabled" textAlign="center">
              {t('noLocksFound')}
            </Text>
            {/* TODO: Implement fetching and displaying user's locks */}
          </LightCard>
        )}
      </AutoColumn>
    </CardBody>
  )
}
