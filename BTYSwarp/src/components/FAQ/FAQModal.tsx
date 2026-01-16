import React, { useEffect } from 'react'
import styled from 'styled-components'
import { Text, CloseIcon } from '@pancakeswap-libs/uikit'
import { useTranslation } from 'react-i18next'
import Modal from '../Modal'
import { FAQ_DATA } from './FAQData'
import useLanguage from '../../hooks/useLanguage'

const ModalContainer = styled.div.attrs({
  className: 'faq-modal-container'
})`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.background};
  height: auto;
`

const ContentWrapper = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  min-height: 0;
  max-height: 80vh;
  
  /* 确保滚动条可见 */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.input};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.textSubtle};
    border-radius: 4px;
    
    &:hover {
      background: ${({ theme }) => theme.colors.text};
    }
  }
`

const FAQList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const FAQItem = styled.div`
  padding: 20px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.input};
  border: 1px solid ${({ theme }) => theme.colors.borderColor};
  transition: all 0.2s;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`

const FAQQuestion = styled(Text)`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.primary};
  line-height: 1.5;
`

const FAQAnswer = styled(Text)`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.8;
  white-space: pre-wrap;
`

interface FAQModalProps {
  isOpen: boolean
  onDismiss: () => void
}

const FAQModal: React.FC<FAQModalProps> = ({
  isOpen,
  onDismiss,
}) => {
  const { t } = useTranslation()
  const { currentLanguage } = useLanguage()

  // 动态添加样式来增加 Modal 宽度（只针对 FAQ Modal）
  useEffect(() => {
    if (!isOpen) {
      // Modal 关闭时清理
      const styleElement = document.getElementById('faq-modal-width-style')
      if (styleElement) {
        styleElement.remove()
      }
      const dialogContent = document.querySelector('[data-reach-dialog-content][aria-label="dialog"]') as HTMLElement
      if (dialogContent && dialogContent.querySelector('.faq-modal-container')) {
        dialogContent.style.width = ''
        dialogContent.style.maxWidth = ''
      }
      return undefined
    }
    
    const styleId = 'faq-modal-width-style'
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }
    
    // 只针对包含 .faq-modal-container 的 Modal
    styleElement.textContent = `
      [data-reach-dialog-content][aria-label="dialog"] .faq-modal-container {
        display: flex !important;
        flex-direction: column !important;
        height: 100% !important;
        overflow: hidden !important;
      }
    `
    
    // 使用定时器检查并应用宽度样式（因为 Modal 可能还没渲染）
    const checkAndApplyWidth = () => {
      const modalContent = document.querySelector('[data-reach-dialog-content][aria-label="dialog"] .faq-modal-container')
      if (modalContent) {
        const dialogContent = modalContent.closest('[data-reach-dialog-content]') as HTMLElement
        if (dialogContent) {
          dialogContent.style.width = window.innerWidth < 768 ? '90%' : '75vw'
          dialogContent.style.maxWidth = window.innerWidth < 768 ? '600px' : '800px'
        }
      }
    }
    
    // 立即检查一次
    checkAndApplyWidth()
    
    // 延迟检查（等待 Modal 渲染）
    const timer1 = setTimeout(checkAndApplyWidth, 100)
    const timer2 = setTimeout(checkAndApplyWidth, 300)
    
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      // 清理样式
      if (styleElement) {
        styleElement.remove()
      }
      // 恢复 Modal 宽度（移除内联样式）
      const dialogContent = document.querySelector('[data-reach-dialog-content][aria-label="dialog"]') as HTMLElement
      if (dialogContent && dialogContent.querySelector('.faq-modal-container')) {
        dialogContent.style.width = ''
        dialogContent.style.maxWidth = ''
      }
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onDismiss={onDismiss} maxHeight={95} minHeight={70}>
      <ModalContainer>
        <Header>
          <Text fontSize="20px" fontWeight="bold">
            {t('faq') || 'FAQ'}
          </Text>
          <CloseIcon onClick={onDismiss} style={{ cursor: 'pointer' }} />
        </Header>

        <ContentWrapper>
          <FAQList>
            {FAQ_DATA.map((faq) => (
              <FAQItem key={faq.id}>
                <FAQQuestion>
                  {faq.question[currentLanguage] || faq.question.en}
                </FAQQuestion>
                <FAQAnswer>
                  {faq.answer[currentLanguage] || faq.answer.en}
                </FAQAnswer>
              </FAQItem>
            ))}
          </FAQList>
        </ContentWrapper>
      </ModalContainer>
    </Modal>
  )
}

export default FAQModal
