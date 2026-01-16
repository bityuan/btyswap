import React, { useState } from 'react'
import styled from 'styled-components'
import { HelpCircle } from 'react-feather'
import { useTranslation } from 'react-i18next'
import FAQModal from './FAQModal'

const FAQButtonContainer = styled.div`
  position: relative;
  display: inline-block;
`

const Button = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.borderColor};
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.2s;
  position: relative;
  
  &:hover {
    background: ${({ theme }) => theme.colors.tertiary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`

const FAQButton: React.FC = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const handleClick = () => {
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <FAQButtonContainer>
      <Button onClick={handleClick} title={t('faq') || 'FAQ'}>
        <HelpCircle />
      </Button>
      <FAQModal
        isOpen={isOpen}
        onDismiss={handleClose}
      />
    </FAQButtonContainer>
  )
}

export default FAQButton

