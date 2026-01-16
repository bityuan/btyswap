export interface FAQItem {
  id: string
  question: {
    'zh-CN': string
    'en': string
  }
  answer: {
    'zh-CN': string
    'en': string
  }
}

export const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: {
      'zh-CN': 'BtySwap 是什么？',
      'en': 'What is BtySwap?'
    },
    answer: {
      'zh-CN': 'BtySwap 是一种去中心化兑换方式，用户可以通过流动性池直接在链上完成代币兑换，无需订单撮合，也无需托管资产。\n本系统完全基于 Uniswap V2 同源协议，无管理员权限，无人为干预兑换结果，代码完全开源。',
      'en': 'BtySwap is a decentralized exchange method where users can complete token swaps directly on-chain through liquidity pools, without order matching or asset custody.\nThe system is fully based on the Uniswap V2 protocol, with no administrator privileges, no human intervention in swap results, and completely open-source code.'
    }
  },
  {
    id: '2',
    question: {
      'zh-CN': '我该如何顺利完成一次兑换？',
      'en': 'How do I complete a swap successfully?'
    },
    answer: {
      'zh-CN': '推荐流程：\n1. 将 BTY Wrap 成 WBTY\n2. 使用 WBTY 与其他 ERC20 代币进行 Swap\n3. 如有需要，可将 WBTY 再 Unwrap 回 BTY',
      'en': 'Recommended process:\n1. Wrap BTY into WBTY\n2. Swap WBTY with other ERC20 tokens\n3. If needed, Unwrap WBTY back to BTY'
    }
  },
  {
    id: '3',
    question: {
      'zh-CN': '为什么要把 BTY 兑换成 WBTY 才能兑换其它资产？',
      'en': 'Why do I need to convert BTY to WBTY before swapping other assets?'
    },
    answer: {
      'zh-CN': 'BTY 是链的原生代币，不是 ERC20，而 Swap 只支持 ERC20 代币之间的交易。\n因此，需要先将 BTY 包装成 WBTY，才能进行兑换。',
      'en': 'BTY is the native token of the chain, not an ERC20 token, while Swap only supports transactions between ERC20 tokens.\nTherefore, BTY must be wrapped into WBTY first before swapping.'
    }
  },
  {
    id: '4',
    question: {
      'zh-CN': 'Wrap / Unwrap 的原理是什么？是否安全？',
      'en': 'What is the principle of Wrap / Unwrap? Is it safe?'
    },
    answer: {
      'zh-CN': 'Wrap / Unwrap 是完全可逆操作：\n1 BTY ⇄ 1 WBTY\n• 无汇率变化\n• 无价格波动\n• 无第三方托管\n\n你可以随时将 BTY 包装成 WBTY，或将 WBTY 解包回 BTY。',
      'en': 'Wrap / Unwrap is a completely reversible operation:\n1 BTY ⇄ 1 WBTY\n• No exchange rate changes\n• No price fluctuations\n• No third-party custody\n\nYou can wrap BTY into WBTY or unwrap WBTY back to BTY at any time.'
    }
  },
  {
    id: '5',
    question: {
      'zh-CN': '什么是滑点（Slippage）？和手续费一样吗？',
      'en': 'What is Slippage? Is it the same as fees?'
    },
    answer: {
      'zh-CN': '不是同一个概念：\n• 手续费（Fee）：固定比例（如 0.3%），支付给流动性提供者\n• 滑点（Slippage）：当交易量相对流动性过大时，导致成交价格偏离预期\n\n滑点与手续费无关，主要反映价格变化风险。',
      'en': 'They are different concepts:\n• Fee: Fixed percentage (e.g., 0.3%), paid to liquidity providers\n• Slippage: When trading volume is too large relative to liquidity, causing the execution price to deviate from expectations\n\nSlippage is independent of fees and mainly reflects price change risk.'
    }
  },
  {
    id: '6',
    question: {
      'zh-CN': '是否支持非流动池代币之间的兑换？',
      'en': 'Does it support swaps between tokens that are not in the same liquidity pool?'
    },
    answer: {
      'zh-CN': '假设只有 TokenA/BTY 和 TokenB/BTY 两个流动池，系统也支持 TokenA ↔ TokenB 兑换。\n但这种跨池兑换会产生更高手续费，实际滑点可近似计算为：\nTokenA/BTY 滑点 × TokenB/BTY 滑点',
      'en': 'Assuming there are only two liquidity pools: TokenA/BTY and TokenB/BTY, the system also supports TokenA ↔ TokenB swaps.\nHowever, such cross-pool swaps will incur higher fees, and the actual slippage can be approximately calculated as:\nTokenA/BTY slippage × TokenB/BTY slippage'
    }
  }
]

