# BTYSwap 配置指南

## 📋 项目概述

BTYSwap 是一个基于 Bityuan 链的去中心化交易所（DEX）前端应用。本项目 Fork 自PancakeSwap的前端代码，并针对 Bityuan 链进行了定制。

### 项目来源

本项目基于 PancakeSwap 的前端界面进行开发，保留了 PancakeSwap 的核心功能和优秀的用户体验，同时针对 Bityuan 链的特殊需求进行了以下定制：

- **链适配**：完全适配 Bityuan 链（ChainId: 2999）
- **原生币支持**：支持 BTY 原生币与 WBTY（Wrapped BTY）的包装和解包
- **网络配置**：针对 Bityuan 测试链和主网进行了网络配置优化
- **合约集成**：集成了 Bityuan 链上的 Swap 合约和流动性池合约

## ✨ 核心功能

### 已实现功能

#### 1. 代币交换（Swap）
- 支持 ERC20 代币之间的即时交换
- 自动路由优化，寻找最佳交易路径
- 滑点保护机制
- 价格影响计算和显示
- 支持 BTY ↔ WBTY 包装/解包

#### 2. 流动性管理
- **添加流动性（Add Liquidity）**
  - 创建新的交易对
  - 向现有交易对添加流动性
  - 自动计算流动性比例
  - 流动性代币（LP Token）自动发放

- **移除流动性（Remove Liquidity）**
  - 从交易对中移除流动性
  - 按比例提取代币
  - 支持部分移除

- **流动性池查看（Pool）**
  - 查看所有已添加的流动性池
  - 显示流动性代币余额
  - 查看池子信息和收益

#### 3. 代币创建（Create Token）
- 支持在 Bityuan 链上创建新的 ERC20 代币
- 自定义代币参数（名称、符号、总供应量等）

### 计划功能（开发中）

- 🔒 **锁仓功能**：代币锁仓和释放机制
- 📊 **更多数据分析**：交易历史、流动性统计等
- 🎯 **更多 DeFi 功能**：质押、挖矿等

## 📦 安装和部署

### 前置要求

- **Node.js**: v16.20.2（他版本可能导致依赖安装失败）
- **Yarn**: >= 1.22.0 或 npm >= 6.x
- **Git**

### 本地开发环境搭建

#### 1. 克隆项目

```bash
git clone <repository-url>
cd frontAndContract/BTYSwarp
```

#### 2. 安装依赖

**⚠️ 重要提示**：

1. **本项目使用本地 SDK 依赖**：`@btyswap-libs/sdk` 通过 `file:../btyswap-sdk` 方式本地引用，需要先构建 `btyswap-sdk`
2. **不要删除 `yarn.lock` 文件**：该文件锁定了所有依赖的确切版本，删除后重新安装可能会安装不兼容的版本，导致编译失败
3. **使用 `yarn install` 而不是 `yarn`**：确保使用锁定的版本

```bash
# 首先安装并构建 btyswap-sdk
cd ../btyswap-sdk
yarn install  # 不要删除 yarn.lock，使用现有锁定版本
yarn build

# 然后安装项目依赖
cd ../BTYSwarp
yarn install  # 不要删除 yarn.lock，使用现有锁定版本
```

#### 3. 启动开发服务器

```bash
yarn start
```

应用将在 `http://localhost:3000` 启动。

### 生产环境构建

#### 1. 构建项目

```bash
# 确保 btyswap-sdk 已构建
cd ../btyswap-sdk
yarn build

# 构建前端项目
cd ../BTYSwarp
yarn build
```

构建完成后，所有文件将输出到 `build/` 目录。

#### 2. 使用 Gzip 压缩构建（推荐）

```bash
yarn build:gzip
```

---

**注意**：本项目部分功能仍在开发中。如有问题，请查看相关文档或提交 Issue。
