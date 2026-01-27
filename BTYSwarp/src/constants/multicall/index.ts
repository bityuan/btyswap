import { ChainId } from '@btyswap-libs/sdk'
import MULTICALL_ABI from './abi.json'

const MULTICALL_NETWORKS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0x98d25EdF17CAE684a146eFe411C2B083FBD238Df', // TODO
  [ChainId.BSCTESTNET]: '0x851911E84cBF796c6cf73b384E660B021D8415e5',
}

export { MULTICALL_ABI, MULTICALL_NETWORKS }
