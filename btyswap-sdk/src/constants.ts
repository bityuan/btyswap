import JSBI from 'jsbi'

// exports for external consumption
export type BigintIsh = JSBI | bigint | string

// TODO: BTY正式链
export enum ChainId {
  MAINNET = 2999,
  BSCTESTNET = 6999
}

// TODO: BTY测试链
// export enum ChainId {
//   MAINNET = 6999,
//   BSCTESTNET = 2999
// }

export enum TradeType {
  EXACT_INPUT,
  EXACT_OUTPUT
}

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP
}

// TODO: BTY正式链
export const FACTORY_ADDRESS = '0xC8d6e4d69Cfd2D799b2424c8ae18C602868BeC13'
// TODO: BTY测试链
// export const FACTORY_ADDRESS = '0xd42aDf97917900FEcAE44405593873A33ca3345F'
// TODO: BTY正式链
export const INIT_CODE_HASH = '0x67d9b6777ecab522347a736dfa495a744ce238a2e26927dde6b743e80ec0e0cb'

export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000)

// exports for internal consumption
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)
export const TWO = JSBI.BigInt(2)
export const THREE = JSBI.BigInt(3)
export const FIVE = JSBI.BigInt(5)
export const TEN = JSBI.BigInt(10)
export const _100 = JSBI.BigInt(100)
export const FEES_NUMERATOR = JSBI.BigInt(9975)
export const FEES_DENOMINATOR = JSBI.BigInt(10000)

export enum SolidityType {
  uint8 = 'uint8',
  uint256 = 'uint256'
}

export const SOLIDITY_TYPE_MAXIMA = {
  [SolidityType.uint8]: JSBI.BigInt('0xff'),
  [SolidityType.uint256]: JSBI.BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
}
