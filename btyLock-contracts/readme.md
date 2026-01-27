# BTY 锁仓合约

这是一个基于 Hardhat 的 BTY 代币锁仓合约项目，支持普通锁仓和线性释放锁仓功能。

## 功能特性

### 核心功能

1. **普通锁仓** (`lock`)
   - 支持 ERC20 代币和 LP 代币
   - 一次性解锁
   - 设置解锁时间
   - 添加描述

2. **线性释放锁仓** (`vestingLock`)
   - TGE（首次释放）百分比
   - 周期释放百分比
   - 周期时间设置
   - 支持 ERC20 代币和 LP 代币

3. **批量线性释放锁仓** (`multipleVestingLock`)
   - 批量创建锁仓
   - 不同用户不同金额
   - 统一的释放规则

4. **锁仓管理**
   - 解锁（普通/线性释放）
   - 编辑锁仓（增加金额、延长解锁时间）
   - 编辑描述
   - 转移所有权
   - 放弃所有权

5. **查询功能**
   - 查询锁仓信息
   - 查询用户所有锁仓
   - 查询代币所有锁仓
   - 查询累计锁仓信息
   - 查询可提取数量

## 安装

1. 安装依赖：

```bash
npm install
```

## 编译

编译合约：

```bash
npm run compile
```

## 测试

运行测试：

```bash
npm run test
```

## 部署

### 测试网部署

1. hardhat.config.js中配置测试网络信息：

```bash
npm run deploy:bityuan_testnet
```

### 主网部署

1. hardhat.config.js中配置主网信息：

```bash
npm run deploy:bityuan
```
