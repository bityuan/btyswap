import { ConnectorNames } from '@pancakeswap-libs/uikit'
import { Web3Provider } from '@ethersproject/providers'
import { InjectedConnector } from '@web3-react/injected-connector'
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import { BscConnector } from '@binance-chain/bsc-connector'
import { NetworkConnector } from './NetworkConnector'

// 私有链2999配置
const NETWORK_URL = 'https://mainnet.bityuan.com/eth'
export const NETWORK_CHAIN_ID = 2999

export const network = new NetworkConnector({
  urls: { [NETWORK_CHAIN_ID]: NETWORK_URL },
})

let networkLibrary: Web3Provider | undefined
export function getNetworkLibrary(): Web3Provider {
  // eslint-disable-next-line no-return-assign
  return (networkLibrary = networkLibrary ?? new Web3Provider(network.provider as any))
}

export const injected = new InjectedConnector({
  supportedChainIds: [2999], // 只支持私有链2999
})

export const bscConnector = new BscConnector({ supportedChainIds: [2999] }) // 只支持私有链2999

// 私有链2999配置
export const walletconnect = new WalletConnectConnector({
  rpc: { 
    2999: NETWORK_URL
  },
  bridge: 'https://bridge.walletconnect.org',
  qrcode: true,
  pollingInterval: 15000,
})

export const connectorsByName: { [connectorName in ConnectorNames]: any } = {
  [ConnectorNames.Injected]: injected,
  [ConnectorNames.WalletConnect]: walletconnect,
  [ConnectorNames.BSC]: bscConnector,
}
