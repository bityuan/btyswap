import React, { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { Button, Text, CloseIcon } from '@pancakeswap-libs/uikit'
import { useTranslation } from 'react-i18next'
import { useActiveWeb3React } from '../../hooks'
import { apiGetImage } from '../../utils/api'
import Modal from '../Modal'

const ModalContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    padding: 16px;
    min-height: 100vh;
  }
`

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text};
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.7;
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
`

const WelcomeText = styled(Text)`
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin-top: 40px;
  margin-bottom: 32px;
  color: ${({ theme }) => theme.colors.text};
  
  @media (max-width: 768px) {
    font-size: 20px;
    margin-top: 32px;
    margin-bottom: 24px;
  }
`

const QRCodeContainer = styled.div`
  width: 300px;
  height: 300px;
  background: ${({ theme }) => theme.colors.invertedContrast};
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    width: 250px;
    height: 250px;
    padding: 16px;
    margin-bottom: 24px;
  }
`

const QRCodeImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`

const QRCodeLoading = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 14px;
`

const InviteLinkContainer = styled.div`
  width: 100%;
  max-width: 500px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
`

const InviteLinkLabel = styled(Text)`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSubtle};
  margin-bottom: 8px;
  text-align: center;
`

const InviteLinkBox = styled.div`
  width: 100%;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.input};
  border: 1px solid ${({ theme }) => theme.colors.borderColor};
  border-radius: 8px;
  margin-bottom: 16px;
  word-break: break-all;
  overflow-wrap: break-word;
`

const InviteLinkText = styled(Text)`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
`

const CopyButton = styled(Button)`
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
`

const ErrorText = styled(Text)`
  color: ${({ theme }) => theme.colors.failure};
  font-size: 14px;
  text-align: center;
  margin-top: 16px;
`

interface InviteRegistrationModalProps {
  isOpen: boolean
  onDismiss: () => void
}

export default function InviteRegistrationModal({ isOpen, onDismiss }: InviteRegistrationModalProps) {
  const { account } = useActiveWeb3React()
  const { t } = useTranslation()
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [inviteLink, setInviteLink] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [copySuccess, setCopySuccess] = useState<boolean>(false)
  const blobUrlRef = useRef<string | null>(null)
  const modalContainerRef = useRef<HTMLDivElement>(null)

  // 生成邀请链接和二维码
  useEffect(() => {
    if (!isOpen || !account) {
      // 关闭时清理之前的 Blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
        setQrCodeUrl('')
      }
      return undefined
    }

    const generateInviteData = async () => {
      setIsLoading(true)
      setError('')

      try {
        // 构建邀请链接参数（根据实际业务需求调整）
        // 根据用户提供的格式：url=address=0x...
        const urlParam = `address=${account}`
        const { origin } = window.location

        // 构建完整的邀请链接
        const fullInviteLink = `${origin}?address=${account}`
        setInviteLink(fullInviteLink)

        // 清理之前的 Blob URL
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
        }

        // 通过 API 获取二维码图片
        const blobUrl = await apiGetImage('/tree/invite/shareCode', {
          url: urlParam,
          origin,
        })
        blobUrlRef.current = blobUrl
        setQrCodeUrl(blobUrl)
      } catch (err: any) {
        console.error('[InviteRegistrationModal] Failed to generate invite data:', err)
        setError(err.message || '生成邀请链接失败')
      } finally {
        setIsLoading(false)
      }
    }

    generateInviteData()

    // 清理函数：组件卸载或依赖变化时释放 Blob URL
    return (): void => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [isOpen, account])

  // 复制到剪贴板（Modal 内需要特殊处理，因为 @reach/dialog 会捕获焦点）
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } else {
        // Modal 会捕获焦点，需要把 textarea 添加到 Modal 容器内
        const container = modalContainerRef.current || document.body
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'absolute'
        textArea.style.left = '-9999px'
        textArea.style.top = '0'
        textArea.style.opacity = '0'
        textArea.setAttribute('readonly', '') // 防止键盘弹出
        container.appendChild(textArea)
        textArea.focus()
        textArea.select()
        textArea.setSelectionRange(0, text.length) // iOS 兼容
        const successful = document.execCommand('copy')
        container.removeChild(textArea)
        if (successful) {
          setCopySuccess(true)
          setTimeout(() => setCopySuccess(false), 2000)
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopy = () => {
    if (inviteLink) {
      copyToClipboard(inviteLink)
    }
  }

  if (!account) {
    return (
      <Modal isOpen={isOpen} onDismiss={onDismiss} maxHeight={90}>
        <ModalContainer>
          <CloseButton onClick={onDismiss}>
            <CloseIcon />
          </CloseButton>
          <WelcomeText>{t('connectWalletFirst') || '请先连接钱包'}</WelcomeText>
        </ModalContainer>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onDismiss={onDismiss} maxHeight={100} minHeight={100}>
      <ModalContainer ref={modalContainerRef}>
        <CloseButton onClick={onDismiss}>
          <CloseIcon />
        </CloseButton>

        <WelcomeText>
          {t('welcomeInvite') || '欢迎邀请好友注册'}
        </WelcomeText>

        <QRCodeContainer>
          {isLoading ? (
            <QRCodeLoading>
              {t('loading') || '加载中...'}
            </QRCodeLoading>
          ) : qrCodeUrl ? (
            <QRCodeImage
              src={qrCodeUrl}
              alt="邀请二维码"
              crossOrigin="anonymous"
              onError={() => {
                setError('二维码加载失败，请刷新重试')
              }}
              onLoad={() => {
                setError('')
              }}
            />
          ) : (
            <QRCodeLoading>
              {t('qrCodeError') || '二维码生成失败'}
            </QRCodeLoading>
          )}
        </QRCodeContainer>

        <InviteLinkContainer>
          <InviteLinkLabel>
            {t('inviteLink') || '邀请链接'}
          </InviteLinkLabel>
          <InviteLinkBox>
            <InviteLinkText>{inviteLink || t('generating') || '生成中...'}</InviteLinkText>
          </InviteLinkBox>
        </InviteLinkContainer>

        <CopyButton
          onClick={handleCopy}
          disabled={!inviteLink || isLoading}
          variant="primary"
        >
          {copySuccess
            ? (t('copied') || '已复制')
            : (t('copyInviteLink') || '复制邀请链接')}
        </CopyButton>

        {error && <ErrorText>{error}</ErrorText>}
      </ModalContainer>
    </Modal>
  )
}
