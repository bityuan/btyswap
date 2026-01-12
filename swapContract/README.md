# Bityuan Pancake V2 部署项目

## 项目概述
这是一个将Pancake V2部署到Bityuan链上的项目，包含：
- WBTY：包装BTY的ERC20代币合约
- Pancake V2核心合约（Factory、Router等）

## 编译合约

```bash
npx hardhat compile
```

## 部署合约

### 1. 配置私钥
在 `hardhat.config.js` 中配置您的私钥：
```javascript
accounts: ["您的私钥"],
```

### 2. 部署到Bityuan链
```bash
npx hardhat run scripts/deploy-simple.js --network bityuan
```

## 部署的合约

1. **WBTY** - 包装BTY代币
   - 功能：将原生BTY包装成ERC20代币
   - 支持：deposit/withdraw

2. **PancakeFactory** - 交易对工厂
   - 功能：创建和管理交易对

3. **PancakeRouter** - 路由合约
   - 功能：处理代币交换和流动性操作

## 注意事项

- 确保账户有足够的BTY支付gas费用
- 部署前请仔细检查私钥配置
- 保存好所有部署的合约地址
