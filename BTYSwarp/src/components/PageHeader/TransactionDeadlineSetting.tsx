import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Input, Text, Flex, Box } from '@pancakeswap-libs/uikit'
import { useUserDeadline } from 'state/user/hooks'
import QuestionHelper from '../QuestionHelper'

const Field = styled.div`
  align-items: center;
  display: inline-flex;

  & > ${Input} {
    max-width: 100px;
  }
`

type TransactionDeadlineSettingModalProps = {
  translateString: (key: string) => string
}

const TransactionDeadlineSetting = ({ translateString }: TransactionDeadlineSettingModalProps) => {
  const [deadline, setDeadline] = useUserDeadline()
  const [value, setValue] = useState(deadline / 60) // deadline in minutes
  const [error, setError] = useState<string | null>(null)

  const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const { value: inputValue } = evt.target
    setValue(parseInt(inputValue, 10))
  }

  // Updates local storage if value is valid
  useEffect(() => {
    try {
      const rawValue = value * 60
      if (!Number.isNaN(rawValue) && rawValue > 0) {
        setDeadline(rawValue)
        setError(null)
      } else {
        setError(translateString('enterValidDeadline'))
      }
    } catch {
      setError(translateString('enterValidDeadline'))
    }
  }, [value, setError, setDeadline, translateString])

  return (
    <Box mb="16px">
      <Flex alignItems="center" mb="8px">
        <Text bold>{translateString('transactionDeadline')}</Text>
        <QuestionHelper
          text={translateString('transactionRevertPending')}
        />
      </Flex>
      <Field>
        <Input type="number" step="1" min="1" value={value} onChange={handleChange} />
        <Text fontSize="14px" ml="8px">
          Minutes
        </Text>
      </Field>
      {error && (
        <Text mt="8px" color="failure">
          {error}
        </Text>
      )}
    </Box>
  )
}

export default TransactionDeadlineSetting
