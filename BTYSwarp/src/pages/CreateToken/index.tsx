import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import { Button, Text as UIKitText, CardBody } from '@pancakeswap-libs/uikit'
import { useTranslation } from 'react-i18next'
import { useActiveWeb3React } from 'hooks'
import { ethers } from 'ethers'
import Container from 'components/Container'
import PageHeader from 'components/PageHeader'
import { AutoColumn } from 'components/Column'
import AppBody from '../AppBody'
import { ERC20_CONTRACT_ABI, ERC20_CONTRACT_BYTECODE } from '../../constants/erc20Contract'
import TransactionConfirmationModal, { ConfirmationModalContent, TransactionErrorContent } from '../../components/TransactionConfirmationModal'

type TabType = 'deploy' | 'mint'

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 5px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
`

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 12px 16px;
  background: ${({ active, theme }) => active ? theme.colors.primary : 'transparent'};
  color: ${({ active, theme }) => active ? 'white' : theme.colors.text};
  border: 1px solid ${({ active, theme }) => active ? theme.colors.primary : theme.colors.borderColor};
  border-radius: 8px;
  border-bottom: 2px solid ${({ active, theme }) => active ? theme.colors.primary : 'transparent'};
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${({ active, theme }) => active ? theme.colors.primary : theme.colors.background};
  }
`

const StyledInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colors.borderColor};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  margin-bottom: 16px;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  @media (max-width: 768px) {
    font-size: 14px;
    padding: 10px 12px;
  }
`

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
`

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.failure};
  font-size: 14px;
  margin-top: 8px;
`

const SuccessText = styled.div`
  color: ${({ theme }) => theme.colors.success};
  font-size: 14px;
  margin-top: 8px;
`

const InfoBox = styled.div`
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  
  @media (max-width: 768px) {
    padding: 10px;
    font-size: 12px;
  }
`

// 禁止创建的主流代币名称和符号
const FORBIDDEN_TOKENS = {
    names: [
        'bitcoin', 'btc', 'ethereum', 'eth', 'binance coin', 'bnb', 'bityuan', 'bty',
        'tether', 'usdt', 'usd coin', 'usdc', 'dai', 'cake', 'pancakeswap',
        'wrapped bitcoin', 'wbtc', 'wrapped ethereum', 'weth', 'wrapped bityuan', 'wbty'
    ],
    symbols: [
        'BTC', 'ETH', 'BNB', 'BTY', 'USDT', 'USDC', 'DAI', 'CAKE', 'WBTC', 'WETH', 'WBTY'
    ]
}

export default function CreateToken() {
    const { t } = useTranslation()
    const { account, library } = useActiveWeb3React()
    const [activeTab, setActiveTab] = useState<TabType>('deploy')

    // 部署相关状态
    const [tokenName, setTokenName] = useState('')
    const [tokenSymbol, setTokenSymbol] = useState('')
    const [initialSupply, setInitialSupply] = useState('')
    const [isMintable, setIsMintable] = useState(true)
    const [deployError, setDeployError] = useState('')
    const [deploySuccess, setDeploySuccess] = useState('')
    const [deployedAddress, setDeployedAddress] = useState('')
    const [deployTxHash, setDeployTxHash] = useState<string | undefined>(undefined)
    const [isDeploying, setIsDeploying] = useState(false)
    const [showDeployConfirm, setShowDeployConfirm] = useState(false)

    // 增发相关状态
    const [contractAddress, setContractAddress] = useState('')
    const [mintAmount, setMintAmount] = useState('')
    const [mintError, setMintError] = useState('')
    const [mintSuccess, setMintSuccess] = useState('')
    const [isMinting, setIsMinting] = useState(false)
    const [mintTxHash, setMintTxHash] = useState<string | undefined>(undefined)
    const [isLoadingTokenInfo, setIsLoadingTokenInfo] = useState(false)
    const [showMintConfirm, setShowMintConfirm] = useState(false)
    const [tokenInfo, setTokenInfo] = useState<{
        name: string
        symbol: string
        decimals: number
        totalSupply: string
        mintable: boolean
        owner: string
    } | null>(null)



    const validateTokenName = (name: string) => {
        const lowerName = name.toLowerCase()
        return !FORBIDDEN_TOKENS.names.some(forbidden => lowerName.includes(forbidden))
    }

    const validateTokenSymbol = (symbol: string) => {
        return !FORBIDDEN_TOKENS.symbols.includes(symbol.toUpperCase())
    }

    // 检查是否是hash mismatch错误（私有链常见问题）
    const isHashMismatchError = (error: any): boolean => {
        const errorMessage = error?.message || error?.toString() || ''

        // 检测多种可能的hash mismatch错误格式
        const mismatchPatterns = [
            'Transaction hash mismatch',
            'hash mismatch',
            'expectedHash',
            'returnedHash'
        ]

        const lowerErrorMessage = errorMessage.toLowerCase()
        const isMismatch = mismatchPatterns.some(pattern =>
            lowerErrorMessage.includes(pattern.toLowerCase())
        ) || (error?.expectedHash && error?.returnedHash)

        return isMismatch
    }

    // 处理hash mismatch错误，但交易实际成功的情况
    const handleHashMismatchSuccess = (operation: string, successMessage: string) => {
        return `${successMessage}`
    }

    // 从交易收据获取合约地址（类似Hardhat脚本的处理方式）
    const getContractAddressFromReceipt = useCallback(async (txHash: string): Promise<string | null> => {
        try {
            if (!library) return null
            const receipt = await library.getTransactionReceipt(txHash)
            return receipt?.contractAddress || null
        } catch {
            return null
        }
    }, [library])

    // 验证交易是否真的成功
    const verifyTransactionSuccess = useCallback(async (txHash: string): Promise<boolean> => {
        try {
            // 尝试获取交易收据
            if (!library) return false
            const receipt = await library.getTransactionReceipt(txHash)
            return receipt && receipt.status === 1
        } catch (error) {
            return false
        }
    }, [library])

    // 复制文本到剪贴板（兼容性处理）
    const copyToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                // 现代浏览器，支持 navigator.clipboard API
                await navigator.clipboard.writeText(text)
                return true
            }

            // 降级方案：使用传统的 document.execCommand
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
            return successful
        } catch {
            return false
        }
    }

    const fetchTokenInfo = useCallback(async (address: string) => {
        if (!library || !ethers.utils.isAddress(address)) {
            setTokenInfo(null)
            setMintError(t('pleaseEnterValidContractAddress'))
            return
        }

        setIsLoadingTokenInfo(true)
        setMintError('')

        try {
            const contract = new ethers.Contract(address, ERC20_CONTRACT_ABI, library)

            const [name, symbol, tokenDecimals, totalSupply, mintable, owner] = await Promise.all([
                contract.name(),
                contract.symbol(),
                contract.decimals(),
                contract.totalSupply(),
                contract.mintable(),
                contract.owner()
            ])

            setTokenInfo({
                name,
                symbol,
                decimals: typeof tokenDecimals === 'number' ? tokenDecimals : tokenDecimals.toNumber(),
                totalSupply: ethers.utils.formatUnits(totalSupply, typeof tokenDecimals === 'number' ? tokenDecimals : tokenDecimals.toNumber()),
                mintable,
                owner
            })
        } catch (err: any) {
            setTokenInfo(null)
            if (err.message?.includes('call revert')) {
                setMintError(t('invalidERC20Contract'))
            } else if (err.message?.includes('network')) {
                setMintError(t('networkConnectionFailed'))
            } else {
                setMintError(t('cannotGetTokenInfoError', { error: err.message || t('unknownError') }))
            }
        } finally {
            setIsLoadingTokenInfo(false)
        }
    }, [library, t])

    const handleContractAddressChange = (address: string) => {
        setContractAddress(address)
        setMintError('')
        setMintSuccess('')
        setTokenInfo(null)

        if (ethers.utils.isAddress(address)) {
            fetchTokenInfo(address)
        } else {
            setMintError(t('pleaseEnterValidContractAddress'))
        }
    }

    const handleDeployClick = () => {
        if (!account) {
            setDeployError(t('pleaseConnectWallet'))
            return
        }

        if (!library) {
            setDeployError(t('cannotGetWeb3'))
            return
        }

        if (!tokenName || !tokenSymbol || !initialSupply) {
            setDeployError(t('pleaseFillAllFields'))
            return
        }

        if (!validateTokenName(tokenName)) {
            setDeployError(t('tokenNameContainsForbidden'))
            return
        }

        if (!validateTokenSymbol(tokenSymbol)) {
            setDeployError(t('tokenSymbolReserved'))
            return
        }

        const supplyNum = parseFloat(initialSupply)
        if (Number.isNaN(supplyNum) || supplyNum <= 0) {
            setDeployError(t('initialSupplyMustBeGreaterThanZero'))
            return
        }

        setShowDeployConfirm(true)
        setDeployError('')
    }

    const handleDeploy = useCallback(async () => {
        if (!account || !library) return

        setIsDeploying(true)
        setDeployError('')
        setDeploySuccess('')
        setDeployedAddress('')
        setDeployTxHash(undefined)

        try {
            const signer = library.getSigner()

            // 将初始供应量转换为wei单位（用户输入的数量就是最终发行量）
            const initialSupplyWei = ethers.utils.parseUnits(initialSupply, 0)
            const decimalsNum = 18 // 默认使用18位小数

            // 创建合约工厂
            const factory = new ethers.ContractFactory(
                ERC20_CONTRACT_ABI,
                ERC20_CONTRACT_BYTECODE,
                signer
            )

            setDeploySuccess(t('deployingContract'))

            // 部署合约
            try {
                const contract = await factory.deploy(
                    tokenName,
                    tokenSymbol,
                    decimalsNum,
                    initialSupplyWei,
                    isMintable
                )

                // 获取部署交易的哈希
                const txHash = contract.deployTransaction.hash
                setDeployTxHash(txHash)
                setDeploySuccess(t('contractDeploying', { txHash }))
                setShowDeployConfirm(true)

                // 等待合约部署完成
                try {
                    await contract.deployed()
                    setDeployedAddress(contract.address)
                    setDeploySuccess(t('tokenDeploySuccess'))
                    setIsDeploying(false)

                    // 清空表单
                    setTokenName('')
                    setTokenSymbol('')
                    setInitialSupply('')
                    setIsMintable(true)

                    // 交易成功后自动关闭确认模态框
                    setTimeout(() => {
                        setShowDeployConfirm(false)
                    }, 2000) // 2秒后自动关闭，让用户看到成功信息
                } catch (deployErr: any) {
                    // 检查是否是hash mismatch错误，但合约实际部署成功
                    const isMismatch = isHashMismatchError(deployErr)

                    if (isMismatch) {
                        // 尝试从交易哈希获取合约地址
                        if (deployErr.transactionHash) {
                            const deployedContractAddress = await getContractAddressFromReceipt(deployErr.transactionHash)
                            if (deployedContractAddress) {
                                setDeployedAddress(deployedContractAddress)
                                setDeploySuccess(handleHashMismatchSuccess('部署', t('tokenDeploySuccess')))

                                // 清空表单
                                setTokenName('')
                                setTokenSymbol('')
                                setInitialSupply('')
                                setIsMintable(true)
                                return
                            }
                        }
                    }
                    throw deployErr
                }
            } catch (deployErr: any) {
                // 检查是否是hash mismatch错误，但合约实际部署成功
                const isMismatch = isHashMismatchError(deployErr)

                if (isMismatch) {
                    // 尝试从交易哈希获取合约地址
                    if (deployErr.transactionHash) {
                        const deployedContractAddress = await getContractAddressFromReceipt(deployErr.transactionHash)
                        if (deployedContractAddress) {
                            setDeployedAddress(deployedContractAddress)
                            setDeploySuccess(handleHashMismatchSuccess('部署', t('tokenDeploySuccess')))
                            setIsDeploying(false)

                            // 清空表单
                            setTokenName('')
                            setTokenSymbol('')
                            setInitialSupply('')
                            setIsMintable(true)

                            // 交易成功后自动关闭确认模态框
                            setTimeout(() => {
                                setShowDeployConfirm(false)
                            }, 2000) // 2秒后自动关闭，让用户看到成功信息
                            return
                        }
                    }
                }
                throw deployErr
            }

        } catch (err: any) {
            setDeployError(t('deployFailed', { error: err.message || t('unknownError') }))
            setDeploySuccess('')
            setDeployedAddress('')
            setDeployTxHash(undefined)
            setIsDeploying(false)
        }
    }, [account, library, tokenName, tokenSymbol, initialSupply, isMintable, t, getContractAddressFromReceipt])

    const handleDeployConfirmDismiss = useCallback(() => {
        setShowDeployConfirm(false)
        if (deployTxHash) {
            setDeployTxHash(undefined)
        }
    }, [deployTxHash])

    const deployModalContent = useCallback(() => {
        if (deployError) {
            return <TransactionErrorContent message={deployError} onDismiss={handleDeployConfirmDismiss} />
        }
        return (
            <ConfirmationModalContent
                title={t('deployToken') || 'Deploy Token'}
                onDismiss={handleDeployConfirmDismiss}
                topContent={() => (
                    <AutoColumn gap="md">
                        <UIKitText fontSize="16px" textAlign="center">
                            {t('confirmDeploy') || 'Are you sure you want to deploy this token?'}
                        </UIKitText>
                        <UIKitText fontSize="14px" color="textSubtle" textAlign="center">
                            {t('tokenName')}: {tokenName}
                        </UIKitText>
                        <UIKitText fontSize="14px" color="textSubtle" textAlign="center">
                            {t('tokenSymbol')}: {tokenSymbol}
                        </UIKitText>
                        <UIKitText fontSize="14px" color="textSubtle" textAlign="center">
                            {t('initialSupply')}: {initialSupply}
                        </UIKitText>
                    </AutoColumn>
                )}
                bottomContent={() => (
                    <Button
                        variant="primary"
                        onClick={handleDeploy}
                        disabled={isDeploying}
                        width="100%"
                    >
                        {isDeploying ? (t('deploying') || 'Deploying...') : (t('confirm') || 'Confirm')}
                    </Button>
                )}
            />
        )
    }, [deployError, handleDeployConfirmDismiss, t, tokenName, tokenSymbol, initialSupply, handleDeploy, isDeploying])

    const handleMintClick = () => {
        if (!account || !library) {
            setMintError(t('pleaseConnectWallet'))
            return
        }

        if (!contractAddress) {
            setMintError(t('pleaseEnterContractAddress'))
            return
        }

        if (!ethers.utils.isAddress(contractAddress)) {
            setMintError(t('pleaseEnterValidContractAddress'))
            return
        }

        if (!tokenInfo) {
            setMintError(t('cannotGetTokenInfo'))
            return
        }

        if (!tokenInfo.mintable) {
            setMintError(t('tokenNotSupportMint'))
            return
        }

        if (tokenInfo.owner.toLowerCase() !== account.toLowerCase()) {
            setMintError(t('onlyOwnerCanMintSimple'))
            return
        }

        if (!mintAmount) {
            setMintError(t('pleaseEnterMintAmount'))
            return
        }

        const amountNum = parseFloat(mintAmount)
        if (Number.isNaN(amountNum) || amountNum <= 0) {
            setMintError(t('mintAmountMustBeGreaterThanZero'))
            return
        }

        setShowMintConfirm(true)
        setMintError('')
    }

    const handleMint = useCallback(async () => {
        if (!account || !library || !contractAddress || !tokenInfo || !mintAmount) return

        setIsMinting(true)
        setMintError('')
        setMintSuccess('')
        setMintTxHash(undefined)

        try {
            const signer = library.getSigner()
            const contract = new ethers.Contract(contractAddress, ERC20_CONTRACT_ABI, signer)

            // 将增发数量转换为wei单位
            const mintAmountWei = ethers.utils.parseUnits(mintAmount, tokenInfo.decimals)

            setMintSuccess(t('mintingToken'))

            // 调用mint函数，增发给调用者自己
            try {
                const tx = await contract.mint(account, mintAmountWei)

                setMintTxHash(tx.hash)
                setMintSuccess(t('mintTxSubmitted', { txHash: tx.hash }))
                setShowMintConfirm(true)

                // 等待交易确认
                try {
                    await tx.wait()
                    setMintSuccess(t('mintSuccess', { amount: mintAmount, symbol: tokenInfo.symbol }))
                    setIsMinting(false)

                    // 清空增发数量
                    setMintAmount('')

                    // 重新获取代币信息
                    fetchTokenInfo(contractAddress)

                    // 交易成功后自动关闭确认模态框
                    setTimeout(() => {
                        setShowMintConfirm(false)
                    }, 2000) // 2秒后自动关闭，让用户看到成功信息
                } catch (waitErr: any) {
                    // 检查是否是hash mismatch错误，但交易实际成功
                    const isMismatch = isHashMismatchError(waitErr)

                    if (isMismatch) {
                        // 尝试验证交易是否真的成功
                        const txHash = waitErr.transactionHash || tx.hash
                        if (txHash) {
                            const isSuccess = await verifyTransactionSuccess(txHash)

                            if (isSuccess) {
                                setMintSuccess(handleHashMismatchSuccess('增发', t('mintSuccess', { amount: mintAmount, symbol: tokenInfo.symbol })))
                                setIsMinting(false)

                                // 清空增发数量
                                setMintAmount('')

                                // 重新获取代币信息
                                fetchTokenInfo(contractAddress)

                                // 交易成功后自动关闭确认模态框
                                setTimeout(() => {
                                    setShowMintConfirm(false)
                                }, 2000) // 2秒后自动关闭，让用户看到成功信息
                                return
                            }
                        }
                    }
                    throw waitErr
                }
            } catch (mintErr: any) {
                // 检查是否是hash mismatch错误，但交易实际成功
                const isMismatch = isHashMismatchError(mintErr)

                if (isMismatch) {
                    // 尝试验证交易是否真的成功
                    const txHash = mintErr.transactionHash
                    if (txHash) {
                        const isSuccess = await verifyTransactionSuccess(txHash)

                        if (isSuccess) {
                            setMintSuccess(handleHashMismatchSuccess('增发', t('mintSuccess', { amount: mintAmount, symbol: tokenInfo.symbol })))

                            // 清空增发数量
                            setMintAmount('')

                            // 重新获取代币信息
                            fetchTokenInfo(contractAddress)
                            return
                        }
                    }
                }
                throw mintErr
            }

        } catch (err: any) {
            setMintError(t('mintFailed', { error: err.message || t('unknownError') }))
            setMintSuccess('')
            setMintTxHash(undefined)
            setIsMinting(false)
        }
    }, [account, library, contractAddress, tokenInfo, mintAmount, t, fetchTokenInfo, verifyTransactionSuccess])

    const handleMintConfirmDismiss = useCallback(() => {
        setShowMintConfirm(false)
        if (mintTxHash) {
            setMintTxHash(undefined)
        }
    }, [mintTxHash])

    const mintModalContent = useCallback(() => {
        if (mintError) {
            return <TransactionErrorContent message={mintError} onDismiss={handleMintConfirmDismiss} />
        }
        return (
            <ConfirmationModalContent
                title={t('mintToken') || 'Mint Token'}
                onDismiss={handleMintConfirmDismiss}
                topContent={() => (
                    <AutoColumn gap="md">
                        <UIKitText fontSize="16px" textAlign="center">
                            {t('confirmMint') || 'Are you sure you want to mint tokens?'}
                        </UIKitText>
                        {tokenInfo && (
                            <>
                                <UIKitText fontSize="14px" color="textSubtle" textAlign="center">
                                    {t('tokenSymbol')}: {tokenInfo.symbol}
                                </UIKitText>
                                <UIKitText fontSize="14px" color="textSubtle" textAlign="center">
                                    {t('mintAmount')}: {mintAmount}
                                </UIKitText>
                            </>
                        )}
                    </AutoColumn>
                )}
                bottomContent={() => (
                    <Button
                        variant="primary"
                        onClick={handleMint}
                        disabled={isMinting}
                        width="100%"
                    >
                        {isMinting ? (t('minting') || 'Minting...') : (t('confirm') || 'Confirm')}
                    </Button>
                )}
            />
        )
    }, [mintError, handleMintConfirmDismiss, t, tokenInfo, mintAmount, handleMint, isMinting])

    const deployPendingText = `Deploying ${tokenSymbol} token`
    const mintPendingText = `Minting ${mintAmount} ${tokenInfo?.symbol || ''} tokens`

    return (
        <Container>
            <AppBody>
                <PageHeader title='Tokenize' description={t('manageERC20OnBTYChain')} showSettings={false} />
                <TransactionConfirmationModal
                    isOpen={showDeployConfirm}
                    onDismiss={handleDeployConfirmDismiss}
                    attemptingTxn={isDeploying}
                    hash={deployTxHash}
                    content={deployModalContent}
                    pendingText={deployPendingText}
                />
                <TransactionConfirmationModal
                    isOpen={showMintConfirm}
                    onDismiss={handleMintConfirmDismiss}
                    attemptingTxn={isMinting}
                    hash={mintTxHash}
                    content={mintModalContent}
                    pendingText={mintPendingText}
                />
                <>
                    <TabContainer>
                        <Tab
                            active={activeTab === 'deploy'}
                            onClick={() => setActiveTab('deploy')}
                        >
                            {t('deployToken')}
                        </Tab>
                        <Tab
                            active={activeTab === 'mint'}
                            onClick={() => setActiveTab('mint')}
                        >
                            {t('mintToken')}
                        </Tab>
                    </TabContainer>

                    {activeTab === 'deploy' ? (
                        <CardBody>
                            <AutoColumn gap="5px">
                            <UIKitText fontSize="18px" fontWeight="bold" marginBottom="8px">
                                {t('createNewERC20Token')}
                            </UIKitText>

                            <UIKitText fontSize="14px" color="textSubtle" marginBottom="16px">
                                {t('deployYourOwnERC20')}
                            </UIKitText>

                            <div>
                                <Label>{t('tokenNameLabel')}</Label>
                                <StyledInput
                                    type="text"
                                    placeholder={t('tokenNamePlaceholder')}
                                    value={tokenName}
                                    onChange={(e) => setTokenName(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label>{t('tokenSymbolLabel')}</Label>
                                <StyledInput
                                    type="text"
                                    placeholder={t('tokenSymbolPlaceholder')}
                                    value={tokenSymbol}
                                    onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                                    maxLength={10}
                                />
                            </div>



                            <div>
                                <Label>{t('initialSupplyLabel')}</Label>
                                <UIKitText fontSize="12px" color="textSubtle" marginBottom="8px">
                                    {t('initialSupplyDesc')}
                                </UIKitText>
                                <StyledInput
                                    type="text"
                                    placeholder={t('initialSupplyPlaceholder')}
                                    value={initialSupply}
                                    onChange={(e) => setInitialSupply(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    type="checkbox"
                                    id="mintable"
                                    checked={isMintable}
                                    onChange={(e) => setIsMintable(e.target.checked)}
                                    style={{ width: '16px', height: '16px' }}
                                />
                                <Label htmlFor="mintable" style={{ marginBottom: '0', cursor: 'pointer' }}>
                                    {t('supportMintable')}
                                </Label>
                            </div>

                            <InfoBox>
                                <strong>{t('forbiddenTokensTitle')}</strong><br />
                                {t('forbiddenTokensList')}
                            </InfoBox>
                            {deployError && <ErrorText>{deployError}</ErrorText>}
                            {deploySuccess && <SuccessText>{deploySuccess}</SuccessText>}

                            <Button
                                onClick={handleDeployClick}
                                disabled={!tokenName || !tokenSymbol || !initialSupply || isDeploying}
                                width="100%"
                                variant="primary"
                            >
                                {t('createToken')}
                            </Button>

                            {deployedAddress && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '16px',
                                    background: '#f8f9fa',
                                    borderRadius: '8px',
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    maxWidth: '100%'
                                }}>
                                    <UIKitText fontSize="14px" fontWeight="bold" marginBottom="8px">
                                        {t('deploySuccess')}
                                    </UIKitText>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                        <UIKitText fontSize="12px" color="textSubtle">
                                            {t('contractAddress')}{deployedAddress.substring(0, 10)}...{deployedAddress.substring(deployedAddress.length - 8)}
                                        </UIKitText>
                                        <Button
                                            size="sm"
                                            variant="tertiary"
                                            onClick={async () => {
                                                await copyToClipboard(deployedAddress)
                                            }}
                                            style={{ padding: '4px 8px', fontSize: '10px' }}
                                        >
                                            {t('copy')}
                                        </Button>
                                    </div>
                                    {deployTxHash && (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                <UIKitText fontSize="12px" color="textSubtle">
                                                    {t('transactionHash')}{deployTxHash.substring(0, 10)}...{deployTxHash.substring(deployTxHash.length - 8)}
                                                </UIKitText>
                                                <Button
                                                    size="sm"
                                                    variant="tertiary"
                                                    onClick={async () => {
                                                        await copyToClipboard(deployTxHash)
                                                    }}
                                                    style={{ padding: '4px 8px', fontSize: '10px' }}
                                                >
                                                    {t('copy')}
                                                </Button>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => window.open(`https://mainnet.bityuan.com/tx/${deployTxHash}`, '_blank')}
                                                style={{ marginTop: '8px' }}
                                            >
                                                {t('viewTransactionOnExplorer')}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                        </AutoColumn>
                        </CardBody>
                    ) : (
                        <CardBody>
                            <AutoColumn gap="16px">
                                <UIKitText fontSize="18px" fontWeight="bold" marginBottom="8px">
                                    {t('mintERC20Token')}
                                </UIKitText>

                            <UIKitText fontSize="14px" color="textSubtle" marginBottom="16px">
                                {t('mintTokenDesc')}
                            </UIKitText>

                            <div>
                                <Label>{t('contractAddressLabel')}</Label>
                                <UIKitText fontSize="12px" color="textSubtle" marginBottom="8px">
                                    {t('contractAddressDesc')}
                                </UIKitText>
                                <StyledInput
                                    type="text"
                                    placeholder="0x..."
                                    value={contractAddress}
                                    onChange={(e) => handleContractAddressChange(e.target.value)}
                                />
                            </div>

                            {isLoadingTokenInfo && (
                                <div style={{
                                    padding: '16px',
                                    background: '#f8f9fa',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    textAlign: 'center'
                                }}>
                                    <UIKitText fontSize="14px" color="textSubtle">
                                        {t('loadingTokenInfo')}
                                    </UIKitText>
                                </div>
                            )}

                            {tokenInfo && !isLoadingTokenInfo && (
                                <div style={{
                                    padding: '16px',
                                    background: '#f8f9fa',
                                    borderRadius: '8px',
                                    marginBottom: '16px'
                                }}>
                                    <UIKitText fontSize="14px" fontWeight="bold" marginBottom="8px">
                                        {t('tokenInfo')}
                                    </UIKitText>
                                    <UIKitText fontSize="12px" color="textSubtle" marginBottom="4px" style={{ wordBreak: 'break-all' }}>
                                        {t('tokenNameField')}{tokenInfo.name}
                                    </UIKitText>
                                    <UIKitText fontSize="12px" color="textSubtle" marginBottom="4px">
                                        {t('tokenSymbolField')}{tokenInfo.symbol}
                                    </UIKitText>
                                    <UIKitText fontSize="12px" color="textSubtle" marginBottom="4px">
                                        {t('decimalsField')}{tokenInfo.decimals}
                                    </UIKitText>
                                    <UIKitText fontSize="12px" color="textSubtle" marginBottom="4px" style={{ wordBreak: 'break-all' }}>
                                        {t('totalSupplyField')}{tokenInfo.totalSupply}
                                    </UIKitText>
                                    <UIKitText fontSize="12px" color="textSubtle" marginBottom="4px">
                                        {t('mintableField')}{tokenInfo.mintable ? t('yes') : t('no')}
                                    </UIKitText>
                                    <UIKitText fontSize="12px" color="textSubtle" marginBottom="4px" style={{ wordBreak: 'break-all' }}>
                                        {t('contractOwner')}{tokenInfo.owner}
                                    </UIKitText>
                                </div>
                            )}

                            {tokenInfo && tokenInfo.mintable && tokenInfo.owner.toLowerCase() === account?.toLowerCase() && (
                                <>
                                    <div>
                                        <Label>{t('mintAmountLabel')}</Label>
                                        <UIKitText fontSize="12px" color="textSubtle" marginBottom="8px">
                                            {t('mintAmountDesc')}
                                        </UIKitText>
                                        <StyledInput
                                            type="text"
                                            placeholder={t('mintAmountPlaceholder')}
                                            value={mintAmount}
                                            onChange={(e) => setMintAmount(e.target.value)}
                                        />
                                    </div>

                                    <InfoBox>
                                        <strong>{t('mintNotice')}</strong>
                                        <div style={{
                                            wordBreak: 'break-all',
                                            marginTop: '4px',
                                            fontSize: '12px',
                                            color: '#999'
                                        }}>
                                            {account}
                                        </div>
                                    </InfoBox>

                                    {mintError && <ErrorText>{mintError}</ErrorText>}
                                    {mintSuccess && <SuccessText>{mintSuccess}</SuccessText>}

                                    <Button
                                        onClick={handleMintClick}
                                        disabled={!mintAmount || isMinting}
                                        width="100%"
                                        variant="secondary"
                                    >
                                        {t('mintTokenButton')}
                                    </Button>

                                    {mintTxHash && (
                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                <UIKitText fontSize="12px" color="textSubtle">
                                                    {t('mintTxHash')}{mintTxHash.substring(0, 10)}...{mintTxHash.substring(mintTxHash.length - 8)}
                                                </UIKitText>
                                                <Button
                                                    size="sm"
                                                    variant="tertiary"
                                                    onClick={async () => {
                                                        await copyToClipboard(mintTxHash)
                                                    }}
                                                    style={{ padding: '4px 8px', fontSize: '10px' }}
                                                >
                                                    {t('copy')}
                                                </Button>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="tertiary"
                                                onClick={() => window.open(`https://mainnet.bityuan.com/tx/${mintTxHash}`, '_blank')}
                                            >
                                                {t('viewMintTransaction')}
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}

                            {tokenInfo && !isLoadingTokenInfo && !tokenInfo.mintable && (
                                <ErrorText>{t('tokenNotMintable')}</ErrorText>
                            )}

                            {tokenInfo && !isLoadingTokenInfo && tokenInfo.owner.toLowerCase() !== account?.toLowerCase() && (
                                <ErrorText>{t('onlyOwnerCanMint', { owner: tokenInfo.owner, account: account || '' })}</ErrorText>
                            )}

                            {!tokenInfo && !isLoadingTokenInfo && contractAddress && mintError && (
                                <ErrorText>{mintError}</ErrorText>
                            )}

                            {mintError && mintError !== t('pleaseEnterValidContractAddress') && <ErrorText>{mintError}</ErrorText>}
                            </AutoColumn>
                        </CardBody>
                    )}
                </>
            </AppBody>
        </Container>
    )
}
