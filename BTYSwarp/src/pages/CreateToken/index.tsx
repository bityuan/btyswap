import React, { useState } from 'react'
import styled from 'styled-components'
import { Button, CardBody, Text as UIKitText } from '@pancakeswap-libs/uikit'
import { useActiveWeb3React } from 'hooks'
import { ethers } from 'ethers'
import CardNav from 'components/CardNav'
import Container from 'components/Container'
import { AutoColumn } from 'components/Column'
import AppBody from '../AppBody'
import { ERC20_CONTRACT_ABI, ERC20_CONTRACT_BYTECODE } from '../../constants/erc20Contract'

type TabType = 'deploy' | 'mint'

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  
  @media (max-width: 768px) {
    padding: 0 8px;
  }
`

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
`

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 12px 16px;
  background: ${({ active, theme }) => active ? theme.colors.primary : 'transparent'};
  color: ${({ active, theme }) => active ? 'white' : theme.colors.text};
  border: none;
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
    const [deployTxHash, setDeployTxHash] = useState('')
    const [isDeploying, setIsDeploying] = useState(false)

    // 增发相关状态
    const [contractAddress, setContractAddress] = useState('')
    const [mintAmount, setMintAmount] = useState('')
    const [mintError, setMintError] = useState('')
    const [mintSuccess, setMintSuccess] = useState('')
    const [isMinting, setIsMinting] = useState(false)
    const [mintTxHash, setMintTxHash] = useState('')
    const [isLoadingTokenInfo, setIsLoadingTokenInfo] = useState(false)
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
    const getContractAddressFromReceipt = async (txHash: string): Promise<string | null> => {
        try {
            if (!library) return null
            const receipt = await library.getTransactionReceipt(txHash)
            return receipt?.contractAddress || null
        } catch {
            return null
        }
    }

    // 验证交易是否真的成功
    const verifyTransactionSuccess = async (txHash: string): Promise<boolean> => {
        try {
            // 尝试获取交易收据
            if (!library) return false
            const receipt = await library.getTransactionReceipt(txHash)
            return receipt && receipt.status === 1
        } catch (error) {
            return false
        }
    }

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

    const fetchTokenInfo = async (address: string) => {
        if (!library || !ethers.utils.isAddress(address)) {
            setTokenInfo(null)
            setMintError('请输入有效的合约地址')
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
                setMintError('该地址不是有效的ERC20合约，或合约不支持我们的接口')
            } else if (err.message?.includes('network')) {
                setMintError('网络连接失败，请检查网络设置')
            } else {
                setMintError(`无法获取代币信息: ${err.message || '未知错误'}`)
            }
        } finally {
            setIsLoadingTokenInfo(false)
        }
    }

    const handleContractAddressChange = (address: string) => {
        setContractAddress(address)
        setMintError('')
        setMintSuccess('')
        setTokenInfo(null)

        if (ethers.utils.isAddress(address)) {
            fetchTokenInfo(address)
        } else {
            setMintError('请输入有效的合约地址')
        }
    }

    const handleDeploy = async () => {
        if (!account) {
            setDeployError('请先连接钱包')
            return
        }

        if (!library) {
            setDeployError('无法获取Web3库')
            return
        }

        if (!tokenName || !tokenSymbol || !initialSupply) {
            setDeployError('请填写所有必填字段')
            return
        }

        if (!validateTokenName(tokenName)) {
            setDeployError('代币名称包含禁止使用的关键词')
            return
        }

        if (!validateTokenSymbol(tokenSymbol)) {
            setDeployError('代币符号已被保留，请使用其他符号')
            return
        }

        const decimalsNum = 18 // 默认使用18位小数

        const supplyNum = parseFloat(initialSupply)
        if (Number.isNaN(supplyNum) || supplyNum <= 0) {
            setDeployError('初始供应量必须大于0')
            return
        }

        setIsDeploying(true)
        setDeployError('')
        setDeploySuccess('')
        setDeployedAddress('')
        setDeployTxHash('')

        try {
            const signer = library.getSigner()

            // 将初始供应量转换为wei单位（用户输入的数量就是最终发行量）
            const initialSupplyWei = ethers.utils.parseUnits(initialSupply, 0)

            // 创建合约工厂
            const factory = new ethers.ContractFactory(
                ERC20_CONTRACT_ABI,
                ERC20_CONTRACT_BYTECODE,
                signer
            )

            setDeploySuccess('正在部署合约，请确认钱包交易...')

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
                setDeploySuccess(`合约部署中，交易哈希: ${txHash}`)

                // 等待合约部署完成
                try {
                    await contract.deployed()
                    setDeployedAddress(contract.address)
                    setDeploySuccess('代币部署成功！')

                    // 清空表单
                    setTokenName('')
                    setTokenSymbol('')
                    setInitialSupply('')
                    setIsMintable(true)
                } catch (deployErr: any) {
                    // 检查是否是hash mismatch错误，但合约实际部署成功
                    const isMismatch = isHashMismatchError(deployErr)

                    if (isMismatch) {
                        // 尝试从交易哈希获取合约地址
                        if (deployErr.transactionHash) {
                            const deployedContractAddress = await getContractAddressFromReceipt(deployErr.transactionHash)
                            if (deployedContractAddress) {
                                setDeployedAddress(deployedContractAddress)
                                setDeploySuccess(handleHashMismatchSuccess('部署', '代币部署成功！'))

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
                            setDeploySuccess(handleHashMismatchSuccess('部署', '代币部署成功！'))

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

        } catch (err: any) {
            setDeployError(`部署失败: ${err.message || '未知错误'}`)
            setDeploySuccess('')
            setDeployedAddress('')
            setDeployTxHash('')
        } finally {
            setIsDeploying(false)
        }
    }

    const handleMint = async () => {
        if (!account || !library) {
            setMintError('请先连接钱包')
            return
        }

        if (!contractAddress) {
            setMintError('请输入合约地址')
            return
        }

        if (!ethers.utils.isAddress(contractAddress)) {
            setMintError('请输入有效的合约地址')
            return
        }

        if (!tokenInfo) {
            setMintError('无法获取代币信息，请检查合约地址')
            return
        }

        if (!tokenInfo.mintable) {
            setMintError('该代币不支持增发功能')
            return
        }

        if (tokenInfo.owner.toLowerCase() !== account.toLowerCase()) {
            setMintError('只有代币合约的owner才能进行增发操作')
            return
        }

        if (!mintAmount) {
            setMintError('请输入增发数量')
            return
        }

        const amountNum = parseFloat(mintAmount)
        if (Number.isNaN(amountNum) || amountNum <= 0) {
            setMintError('增发数量必须大于0')
            return
        }

        setIsMinting(true)
        setMintError('')
        setMintSuccess('')
        setMintTxHash('')

        try {
            const signer = library.getSigner()
            const contract = new ethers.Contract(contractAddress, ERC20_CONTRACT_ABI, signer)

            // 将增发数量转换为wei单位
            const mintAmountWei = ethers.utils.parseUnits(mintAmount, tokenInfo.decimals)

            setMintSuccess('正在增发代币，请确认钱包交易...')

            // 调用mint函数，增发给调用者自己
            try {
                const tx = await contract.mint(account, mintAmountWei)

                setMintTxHash(tx.hash)
                setMintSuccess(`增发交易已提交，交易哈希: ${tx.hash}`)

                // 等待交易确认
                try {
                    await tx.wait()
                    setMintSuccess(`增发成功！已向您的地址增发 ${mintAmount} 个 ${tokenInfo.symbol} 代币`)

                    // 清空增发数量
                    setMintAmount('')

                    // 重新获取代币信息
                    fetchTokenInfo(contractAddress)
                } catch (waitErr: any) {
                    // 检查是否是hash mismatch错误，但交易实际成功
                    const isMismatch = isHashMismatchError(waitErr)

                    if (isMismatch) {
                        // 尝试验证交易是否真的成功
                        const txHash = waitErr.transactionHash || tx.hash
                        if (txHash) {
                            const isSuccess = await verifyTransactionSuccess(txHash)

                            if (isSuccess) {
                                setMintSuccess(handleHashMismatchSuccess('增发', `增发成功！已向您的地址增发 ${mintAmount} 个 ${tokenInfo.symbol} 代币`))

                                // 清空增发数量
                                setMintAmount('')

                                // 重新获取代币信息
                                fetchTokenInfo(contractAddress)
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
                            setMintSuccess(handleHashMismatchSuccess('增发', `增发成功！已向您的地址增发 ${mintAmount} 个 ${tokenInfo.symbol} 代币`))

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
            setMintError(`增发失败: ${err.message || '未知错误'}`)
            setMintSuccess('')
            setMintTxHash('')
        } finally {
            setIsMinting(false)
        }
    }

    return (
        <Container>
            <CardNav activeIndex={2} />
            <AppBody>
                <Wrapper>
                    <CardBody>
                        <AutoColumn gap="20px">
                            <UIKitText fontSize="24px" fontWeight="bold" textAlign="center">
                                Tokenize
                            </UIKitText>

                            <UIKitText fontSize="14px" color="textSubtle" textAlign="center">
                                在BTY Chain上管理您的ERC20代币
                            </UIKitText>

                            <>
                                <TabContainer>
                                        <Tab
                                            active={activeTab === 'deploy'}
                                            onClick={() => setActiveTab('deploy')}
                                        >
                                            发行代币
                                        </Tab>
                                        <Tab
                                            active={activeTab === 'mint'}
                                            onClick={() => setActiveTab('mint')}
                                        >
                                            增发代币
                                        </Tab>
                                    </TabContainer>

                                    {activeTab === 'deploy' ? (
                                        <AutoColumn gap="16px">
                                            <UIKitText fontSize="18px" fontWeight="bold" marginBottom="8px">
                                                创建新的ERC20代币
                                            </UIKitText>

                                            <UIKitText fontSize="14px" color="textSubtle" marginBottom="16px">
                                                在BTY Chain上部署您自己的ERC20代币合约
                                            </UIKitText>

                                            <div>
                                                <Label>代币名称 *</Label>
                                                <StyledInput
                                                    type="text"
                                                    placeholder="例如: My Token"
                                                    value={tokenName}
                                                    onChange={(e) => setTokenName(e.target.value)}
                                                />
                                            </div>

                                            <div>
                                                <Label>代币符号 *</Label>
                                                <StyledInput
                                                    type="text"
                                                    placeholder="例如: MTK"
                                                    value={tokenSymbol}
                                                    onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                                                    maxLength={10}
                                                />
                                            </div>



                                            <div>
                                                <Label>初始供应量 *</Label>
                                                <UIKitText fontSize="12px" color="textSubtle" marginBottom="8px">
                                                    输入您想要发行的代币总数量（例如：500000000 表示发行5亿个代币）
                                                </UIKitText>
                                                <StyledInput
                                                    type="text"
                                                    placeholder="例如: 500000000"
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
                                                    支持增发功能（部署后可以增加代币供应量）
                                                </Label>
                                            </div>

                                            <InfoBox>
                                                <strong>禁止使用的代币名称/符号：</strong><br />
                                                BTC, ETH, BNB, BTY, USDT, USDC, DAI, CAKE, WBTC, WETH, WBTY 等主流代币
                                            </InfoBox>
                                            {deployError && <ErrorText>{deployError}</ErrorText>}
                                            {deploySuccess && <SuccessText>{deploySuccess}</SuccessText>}

                                            <Button
                                                onClick={handleDeploy}
                                                disabled={!tokenName || !tokenSymbol || !initialSupply || isDeploying}
                                                width="100%"
                                                variant="primary"
                                            >
                                                {isDeploying ? '部署中...' : '创建代币'}
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
                                                        部署成功！
                                                    </UIKitText>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                        <UIKitText fontSize="12px" color="textSubtle">
                                                            合约地址: {deployedAddress.substring(0, 10)}...{deployedAddress.substring(deployedAddress.length - 8)}
                                                        </UIKitText>
                                                        <Button
                                                            size="sm"
                                                            variant="tertiary"
                                                            onClick={async () => {
                                                                await copyToClipboard(deployedAddress)
                                                            }}
                                                            style={{ padding: '4px 8px', fontSize: '10px' }}
                                                        >
                                                            复制
                                                        </Button>
                                                    </div>
                                                    {deployTxHash && (
                                                        <>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                                <UIKitText fontSize="12px" color="textSubtle">
                                                                    交易哈希: {deployTxHash.substring(0, 10)}...{deployTxHash.substring(deployTxHash.length - 8)}
                                                                </UIKitText>
                                                                <Button
                                                                    size="sm"
                                                                    variant="tertiary"
                                                                    onClick={async () => {
                                                                        await copyToClipboard(deployTxHash)
                                                                    }}
                                                                    style={{ padding: '4px 8px', fontSize: '10px' }}
                                                                >
                                                                    复制
                                                                </Button>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() => window.open(`https://mainnet.bityuan.com/tx/${deployTxHash}`, '_blank')}
                                                                style={{ marginTop: '8px' }}
                                                            >
                                                                在区块浏览器中查看交易
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </AutoColumn>
                                    ) : (
                                        <AutoColumn gap="16px">
                                            <UIKitText fontSize="18px" fontWeight="bold" marginBottom="8px">
                                                增发ERC20代币
                                            </UIKitText>

                                            <UIKitText fontSize="14px" color="textSubtle" marginBottom="16px">
                                                为已部署的代币合约增加供应量（仅限合约owner操作）
                                            </UIKitText>

                                            <div>
                                                <Label>合约地址 *</Label>
                                                <UIKitText fontSize="12px" color="textSubtle" marginBottom="8px">
                                                    输入您要增发的代币合约地址
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
                                                        正在获取代币信息...
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
                                                        代币信息
                                                    </UIKitText>
                                                    <UIKitText fontSize="12px" color="textSubtle" marginBottom="4px" style={{ wordBreak: 'break-all' }}>
                                                        名称: {tokenInfo.name}
                                                    </UIKitText>
                                                    <UIKitText fontSize="12px" color="textSubtle" marginBottom="4px">
                                                        符号: {tokenInfo.symbol}
                                                    </UIKitText>
                                                    <UIKitText fontSize="12px" color="textSubtle" marginBottom="4px">
                                                        小数位数: {tokenInfo.decimals}
                                                    </UIKitText>
                                                    <UIKitText fontSize="12px" color="textSubtle" marginBottom="4px" style={{ wordBreak: 'break-all' }}>
                                                        当前总供应量: {tokenInfo.totalSupply}
                                                    </UIKitText>
                                                    <UIKitText fontSize="12px" color="textSubtle" marginBottom="4px">
                                                        支持增发: {tokenInfo.mintable ? '是' : '否'}
                                                    </UIKitText>
                                                    <UIKitText fontSize="12px" color="textSubtle" marginBottom="4px" style={{ wordBreak: 'break-all' }}>
                                                        合约Owner: {tokenInfo.owner}
                                                    </UIKitText>
                                                </div>
                                            )}

                                            {tokenInfo && tokenInfo.mintable && tokenInfo.owner.toLowerCase() === account?.toLowerCase() && (
                                                <>
                                                    <div>
                                                        <Label>增发数量 *</Label>
                                                        <UIKitText fontSize="12px" color="textSubtle" marginBottom="8px">
                                                            输入要增发的代币数量（将增发给您的钱包地址）
                                                        </UIKitText>
                                                        <StyledInput
                                                            type="text"
                                                            placeholder="例如: 1000000"
                                                            value={mintAmount}
                                                            onChange={(e) => setMintAmount(e.target.value)}
                                                        />
                                                    </div>

                                                    <InfoBox>
                                                        <strong>注意：</strong>增发的代币将直接发送到您的钱包地址
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
                                                        onClick={handleMint}
                                                        disabled={!mintAmount || isMinting}
                                                        width="100%"
                                                        variant="secondary"
                                                    >
                                                        {isMinting ? '增发中...' : '增发代币'}
                                                    </Button>

                                                    {mintTxHash && (
                                                        <div style={{ marginTop: '12px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                                <UIKitText fontSize="12px" color="textSubtle">
                                                                    增发交易哈希: {mintTxHash.substring(0, 10)}...{mintTxHash.substring(mintTxHash.length - 8)}
                                                                </UIKitText>
                                                                <Button
                                                                    size="sm"
                                                                    variant="tertiary"
                                                                    onClick={async () => {
                                                                        await copyToClipboard(mintTxHash)
                                                                    }}
                                                                    style={{ padding: '4px 8px', fontSize: '10px' }}
                                                                >
                                                                    复制
                                                                </Button>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="tertiary"
                                                                onClick={() => window.open(`https://mainnet.bityuan.com/tx/${mintTxHash}`, '_blank')}
                                                            >
                                                                查看增发交易
                                                            </Button>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {tokenInfo && !isLoadingTokenInfo && !tokenInfo.mintable && (
                                                <ErrorText>该代币合约不支持增发功能</ErrorText>
                                            )}

                                            {tokenInfo && !isLoadingTokenInfo && tokenInfo.owner.toLowerCase() !== account?.toLowerCase() && (
                                                <ErrorText>只有代币合约的owner才能进行增发操作。当前合约Owner: {tokenInfo.owner}，您的地址: {account}</ErrorText>
                                            )}

                                            {!tokenInfo && !isLoadingTokenInfo && contractAddress && mintError && (
                                                <ErrorText>{mintError}</ErrorText>
                                            )}

                                            {mintError && mintError !== '请输入有效的合约地址' && <ErrorText>{mintError}</ErrorText>}
                                        </AutoColumn>
                                    )}
                                </>
                        </AutoColumn>
                    </CardBody>
                </Wrapper>
            </AppBody>
        </Container>
    )
}
