import invariant from 'tiny-invariant'
import { ChainId } from '../constants'
import { validateAndParseAddress } from '../utils'
import { Currency } from './currency'

/**
 * Represents an ERC20 token with a unique address and some metadata.
 */
export class Token extends Currency {
  public readonly chainId: ChainId
  public readonly address: string

  public constructor(chainId: ChainId, address: string, decimals: number, symbol?: string, name?: string) {
    super(decimals, symbol, name)
    this.chainId = chainId
    this.address = validateAndParseAddress(address)
  }

  /**
   * Returns true if the two tokens are equivalent, i.e. have the same chainId and address.
   * @param other other token to compare
   */
  public equals(other: Token): boolean {
    // short circuit on reference equality
    if (this === other) {
      return true
    }
    return this.chainId === other.chainId && this.address === other.address
  }

  /**
   * Returns true if the address of this token sorts before the address of the other token
   * @param other other token to compare
   * @throws if the tokens have the same address
   * @throws if the tokens are on different chains
   */
  public sortsBefore(other: Token): boolean {
    invariant(this.chainId === other.chainId, 'CHAIN_IDS')
    invariant(this.address !== other.address, 'ADDRESSES')
    return this.address.toLowerCase() < other.address.toLowerCase()
  }
}

/**
 * Compares two currencies for equality
 */
export function currencyEquals(currencyA: Currency, currencyB: Currency): boolean {
  if (currencyA instanceof Token && currencyB instanceof Token) {
    return currencyA.equals(currencyB)
  } else if (currencyA instanceof Token) {
    return false
  } else if (currencyB instanceof Token) {
    return false
  } else {
    return currencyA === currencyB
  }
}
// TODO: BTY正式链
export const WETH = {
  [ChainId.MAINNET]: new Token(
    ChainId.MAINNET,
    '0xE09f5BdCA143f6e4Ad9d43516A1D1289A3DD6dFC',
    18,
    'WBTY',
    'Wrapped BTY'
  ),
  [ChainId.BSCTESTNET]: new Token(
    ChainId.BSCTESTNET,
    '0xE09f5BdCA143f6e4Ad9d43516A1D1289A3DD6dFC',
    18,
    'WBTY',
    'Wrapped BTY'
  )
}

// TODO: BTY测试链
// export const WETH = {
//   [ChainId.MAINNET]: new Token(
//     ChainId.MAINNET,
//     '0xb1e65748aCc02B653b007f2E54ee6F8f127eB6D6',
//     18,
//     'WBTY',
//     'Wrapped BTY'
//   ),
//   [ChainId.BSCTESTNET]: new Token(
//     ChainId.BSCTESTNET,
//     '0x60dCe135B7c001D4E0a88399DE80e2A2FaF79b06',
//     18,
//     'WBTY',
//     'Wrapped WBTY'
//   )
// }
