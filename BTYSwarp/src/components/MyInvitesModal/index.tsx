import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Text, CloseIcon } from '@pancakeswap-libs/uikit'
import { useTranslation } from 'react-i18next'
import { useActiveWeb3React } from '../../hooks'
import { apiGetWithAuth } from '../../utils/api'
import { authUtil } from '../../utils/auth'
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

const Title = styled(Text)`
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

const TableContainer = styled.div`
  width: 100%;
  max-width: 800px;
  background: ${({ theme }) => theme.colors.invertedContrast};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const TableHeader = styled.thead`
  background: ${({ theme }) => theme.colors.tertiary};
`

const TableHeaderRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
`

const TableHeaderCell = styled.th`
  padding: 16px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  
  &:first-child {
    width: 80px;
    text-align: center;
  }
  
  @media (max-width: 768px) {
    padding: 12px;
    font-size: 12px;
    
    &:first-child {
      width: 60px;
    }
  }
`

const TableBody = styled.tbody``

const TableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${({ theme }) => theme.colors.tertiary};
  }
`

const TableCell = styled.td`
  padding: 16px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  
  &:first-child {
    text-align: center;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSubtle};
  }
  
  @media (max-width: 768px) {
    padding: 12px;
    font-size: 12px;
  }
`

const AddressText = styled(Text)`
  font-family: monospace;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  
  @media (max-width: 768px) {
    font-size: 12px;
  }
`

const LoadingContainer = styled.div`
  width: 100%;
  max-width: 800px;
  padding: 40px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 14px;
`

const EmptyContainer = styled.div`
  width: 100%;
  max-width: 800px;
  padding: 40px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 14px;
`

const ErrorText = styled(Text)`
  color: ${({ theme }) => theme.colors.failure};
  font-size: 14px;
  text-align: center;
  margin-top: 16px;
`

interface MyInvitesModalProps {
    isOpen: boolean
    onDismiss: () => void
}

export default function MyInvitesModal({ isOpen, onDismiss }: MyInvitesModalProps) {
    const { account } = useActiveWeb3React()
    const { t } = useTranslation()
    const [invites, setInvites] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<string>('')

    // 格式化地址显示（前6位...后6位）
    const formatAddress = (address: string): string => {
        if (!address || address.length < 12) {
            return address
        }
        return `${address.slice(0, 12)}...${address.slice(-12)}`
    }

    // 获取邀请列表
    useEffect(() => {
        if (!isOpen || !account) {
            return () => {
                // 清理函数，无需操作
            }
        }

        const fetchInvites = async () => {
            setIsLoading(true)
            setError('')

            try {
                // 获取 token
                const token = authUtil.getToken()
                if (!token) {
                    throw new Error('未登录，请先连接钱包并登录')
                }
                const response = await apiGetWithAuth('/swap/auth/invitor', token)
                
                // 如果返回的是对象数组，提取address字段
                if (Array.isArray(response)) {
                    const addresses = response.map((item: any) => {
                        if (typeof item === 'string') {
                            return item
                        }
                        // 提取 address 字段
                        return item.address || item
                    }).filter((addr) => addr) // 过滤掉空值
                    setInvites(addresses)
                } else {
                    console.warn('[MyInvitesModal] Response is not an array:', response, 'Type:', typeof response)
                    // 如果 response 是对象且包含 data 字段，尝试从 data 中获取
                    if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)) {
                        const dataArray = (response as any).data
                        const addresses = dataArray.map((item: any) => {
                            if (typeof item === 'string') {
                                return item
                            }
                            return item.address || item
                        }).filter((addr) => addr)
                        setInvites(addresses)
                    } else {
                        setInvites([])
                    }
                }
            } catch (err: any) {
                setError(err.message || '获取邀请列表失败')
                setInvites([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchInvites()

        // 清理函数
        return () => {
            // 组件卸载或依赖变化时的清理操作
        }
    }, [isOpen, account])

    if (!account) {
        return (
            <Modal isOpen={isOpen} onDismiss={onDismiss} maxHeight={90}>
                <ModalContainer>
                    <CloseButton onClick={onDismiss}>
                        <CloseIcon />
                    </CloseButton>
                    <Title>{t('connectWalletFirst') || '请先连接钱包'}</Title>
                </ModalContainer>
            </Modal>
        )
    }

    return (
        <Modal isOpen={isOpen} onDismiss={onDismiss} maxHeight={100} minHeight={100}>
            <ModalContainer>
                <CloseButton onClick={onDismiss}>
                    <CloseIcon />
                </CloseButton>

                <Title>
                    {t('myInvites') || '我的邀请'}
                </Title>

                <TableContainer>
                    {isLoading ? (
                        <LoadingContainer>
                            {t('loading') || '加载中...'}
                        </LoadingContainer>
                    ) : error ? (
                        <EmptyContainer>
                            <ErrorText>{error}</ErrorText>
                        </EmptyContainer>
                    ) : invites.length === 0 ? (
                        <EmptyContainer>
                            {t('noInvites') || '暂无邀请记录'}
                        </EmptyContainer>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableHeaderRow>
                                    <TableHeaderCell>{t('number') || '序号'}</TableHeaderCell>
                                    <TableHeaderCell>{t('userAddress') || '用户地址'}</TableHeaderCell>
                                </TableHeaderRow>
                            </TableHeader>
                            <TableBody>
                                {invites.map((address, index) => (
                                    <TableRow key={address}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>
                                            <AddressText>{formatAddress(address)}</AddressText>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>
            </ModalContainer>
        </Modal>
    )
}

