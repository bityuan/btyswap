# BTYSwap SDK

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## V2 SDK for the BTY chain

This is a fork of `@pancakeswap-libs/sdk-v2` modified to work on the BTY chain.

## Overview

BTYSwap SDK 是一个用于在 BTY 链上构建去中心化交易所（DEX）应用的开发工具包。该 SDK 提供了完整的工具和接口，用于与 BTYSwap 协议进行交互，包括代币交换、流动性管理、价格计算等功能。

## Features

### Core Entities
- **Token & Currency**: 代币和货币类型管理，支持原生币（BTY）和 ERC20 代币
- **Pair**: 交易对管理，支持创建和查询流动性池
- **Route**: 交易路由计算，支持多跳路径优化
- **Trade**: 交易计算和优化，包括价格影响、滑点计算等

### Trading Features
- **Swap Calculation**: 精确的交换计算，支持精确输入和精确输出两种模式
- **Price Calculation**: 实时价格计算和价格影响分析
- **Slippage Protection**: 滑点保护机制
- **Multi-hop Routing**: 多跳路由优化，自动寻找最佳交易路径

### Utilities
- **Router Integration**: 与 BTYSwap Router 合约的完整集成，生成交易参数
- **On-chain Data Fetcher**: 从链上获取代币信息、交易对数据等
- **Fraction Math**: 高精度数学运算，使用 JSBI 处理大数计算
- **Address Validation**: 地址格式验证和解析
