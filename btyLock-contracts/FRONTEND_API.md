# BTY 锁仓合约 - 前端开发文档

## 📋 目录

1. [合约基本信息](#合约基本信息)
2. [数据结构](#数据结构)
3. [核心功能接口](#核心功能接口)
4. [查询接口](#查询接口)
5. [事件监听](#事件监听)
6. [前端功能模块](#前端功能模块)
7. [代码示例](#代码示例)
8. [错误处理](#错误处理)

---

## 合约基本信息

### 合约地址
```
请替换为实际部署的合约地址
CONTRACT_ADDRESS = "0x..." 
```

### 网络信息
- **测试网**: ChainId: 6999, RPC: http://192.168.3.239:8546
- **主网**: ChainId: 2999, RPC: https://mainnet.bityuan.com/eth

### ABI 位置
合约 ABI 文件位于：`artifacts/contracts/BTYLock.sol/BTYLock.json`

---

## 数据结构

### Lock 结构体
```typescript
interface Lock {
  id: bigint;              // 锁仓ID (实际ID = ID_PADDING + 索引，ID_PADDING = 1000000)
  token: string;           // 代币地址
  owner: string;           // 锁仓所有者地址
  amount: bigint;          // 锁仓总数量
  lockDate: bigint;        // 锁仓创建时间（Unix时间戳）
  tgeDate: bigint;         // TGE日期（线性释放）或解锁日期（普通锁仓）
  tgeBps: bigint;          // TGE释放百分比（基点，10000 = 100%），普通锁仓为0
  cycle: bigint;           // 释放周期（秒），普通锁仓为0
  cycleBps: bigint;        // 每周期释放百分比（基点），普通锁仓为0
  unlockedAmount: bigint;  // 已解锁数量
  description: string;     // 锁仓描述
}
```

### CumulativeLockInfo 结构体
```typescript
interface CumulativeLockInfo {
  token: string;    // 代币地址
  factory: string;  // LP代币的工厂地址（普通代币为0x0）
  amount: bigint;   // 累计锁仓数量
}
```

### 重要常量
- **ID_PADDING**: `1000000` - 锁仓ID的起始偏移量

---

## 核心功能接口

### 1. 普通锁仓 (lock)

创建一次性解锁的锁仓。

```typescript
function lock(
  owner: string,           // 锁仓所有者地址
  token: string,           // 代币合约地址
  isLpToken: boolean,      // 是否为LP代币
  amount: bigint,          // 锁仓数量（需要先approve）
  unlockDate: bigint,      // 解锁时间（Unix时间戳，必须大于当前时间）
  description: string      // 锁仓描述
): Promise<bigint>         // 返回锁仓ID
```

**前端流程：**
1. 用户选择代币和输入数量
2. 检查代币余额和授权额度
3. 如果授权不足，先调用代币的 `approve(contractAddress, amount)`
4. 调用 `lock()` 函数
5. 等待交易确认
6. 监听 `LockAdded` 事件获取锁仓ID

**示例：**
```typescript
// 1. 先授权代币
const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, amount);
await approveTx.wait();

// 2. 创建锁仓
const lockContract = new ethers.Contract(CONTRACT_ADDRESS, BTY_LOCK_ABI, signer);
const unlockDate = Math.floor(Date.now() / 1000) + 86400 * 30; // 30天后解锁
const tx = await lockContract.lock(
  userAddress,
  tokenAddress,
  false, // 不是LP代币
  ethers.parseEther("1000"),
  unlockDate,
  "项目方锁仓"
);
const receipt = await tx.wait();
// 从事件中获取 lockId
const lockId = receipt.logs[0].args.id;
```

---

### 2. 线性释放锁仓 (vestingLock)

创建线性释放（分期解锁）的锁仓。

```typescript
function vestingLock(
  owner: string,           // 锁仓所有者地址
  token: string,           // 代币合约地址
  isLpToken: boolean,      // 是否为LP代币
  amount: bigint,          // 锁仓总数量
  tgeDate: bigint,         // TGE（首次释放）时间（Unix时间戳）
  tgeBps: bigint,         // TGE释放百分比（基点，如2000 = 20%）
  cycle: bigint,           // 释放周期（秒，如86400 = 1天）
  cycleBps: bigint,        // 每周期释放百分比（基点，如1000 = 10%）
  description: string      // 锁仓描述
): Promise<bigint>        // 返回锁仓ID
```

**参数说明：**
- `tgeBps`: 0 < tgeBps < 10000（0-100%）
- `cycleBps`: 0 < cycleBps < 10000
- `tgeBps + cycleBps <= 10000`（总和不能超过100%）
- `cycle > 0`（周期必须大于0）

**前端流程：**
1. 用户输入锁仓参数（数量、TGE日期、TGE百分比、周期、周期百分比）
2. 验证参数合法性
3. 授权代币
4. 调用 `vestingLock()`
5. 等待确认并获取锁仓ID

**示例：**
```typescript
const tgeDate = Math.floor(Date.now() / 1000) + 86400; // 1天后TGE
const tgeBps = 2000;      // 20% TGE释放
const cycle = 86400;       // 1天周期
const cycleBps = 1000;    // 每周期释放10%

const tx = await lockContract.vestingLock(
  userAddress,
  tokenAddress,
  false,
  ethers.parseEther("10000"),
  tgeDate,
  tgeBps,
  cycle,
  cycleBps,
  "团队代币线性释放"
);
```

---

### 3. 批量线性释放锁仓 (multipleVestingLock)

批量创建多个用户的线性释放锁仓（统一释放规则）。

```typescript
function multipleVestingLock(
  owners: string[],        // 所有者地址数组
  amounts: bigint[],       // 对应的锁仓数量数组
  token: string,           // 代币合约地址
  isLpToken: boolean,      // 是否为LP代币
  tgeDate: bigint,         // TGE时间
  tgeBps: bigint,          // TGE释放百分比
  cycle: bigint,           // 释放周期
  cycleBps: bigint,        // 每周期释放百分比
  description: string      // 锁仓描述
): Promise<bigint[]>      // 返回锁仓ID数组
```

**前端流程：**
1. 准备用户地址和金额数组（长度必须相等）
2. 计算总金额并授权
3. 调用 `multipleVestingLock()`
4. 获取所有锁仓ID

**示例：**
```typescript
const owners = [
  "0x1234...",
  "0x5678...",
  "0x9abc..."
];
const amounts = [
  ethers.parseEther("1000"),
  ethers.parseEther("2000"),
  ethers.parseEther("3000")
];

// 授权总金额
const totalAmount = amounts.reduce((sum, amt) => sum + amt, 0n);
await tokenContract.approve(CONTRACT_ADDRESS, totalAmount);

const tx = await lockContract.multipleVestingLock(
  owners,
  amounts,
  tokenAddress,
  false,
  tgeDate,
  tgeBps,
  cycle,
  cycleBps,
  "批量空投锁仓"
);
const lockIds = await tx.wait();
```

---

### 4. 解锁 (unlock)

解锁锁仓（普通锁仓一次性解锁，线性释放锁仓部分解锁）。

```typescript
function unlock(lockId: bigint): Promise<TransactionReceipt>
```

**前端流程：**
1. 查询锁仓信息
2. 检查是否可解锁（时间是否到达、是否有可解锁数量）
3. 调用 `unlock()`
4. 等待确认

**示例：**
```typescript
// 先查询可解锁数量
const withdrawable = await lockContract.withdrawableTokens(lockId);
if (withdrawable > 0) {
  const tx = await lockContract.unlock(lockId);
  await tx.wait();
  console.log("解锁成功");
}
```

---

### 5. 编辑锁仓 (editLock)

修改锁仓的金额或解锁时间（只能增加，不能减少）。

```typescript
function editLock(
  lockId: bigint,          // 锁仓ID
  newAmount: bigint,       // 新金额（0表示不修改，必须 >= 当前金额）
  newUnlockDate: bigint    // 新解锁时间（0表示不修改，必须 >= 当前解锁时间）
): Promise<TransactionReceipt>
```

**前端流程：**
1. 检查锁仓是否已解锁（`unlockedAmount == 0`）
2. 如果增加金额，需要先授权额外的代币
3. 调用 `editLock()`

**示例：**
```typescript
// 只延长解锁时间
await lockContract.editLock(lockId, 0, newUnlockDate);

// 只增加金额
const additionalAmount = ethers.parseEther("500");
await tokenContract.approve(CONTRACT_ADDRESS, additionalAmount);
await lockContract.editLock(lockId, newAmount, 0);

// 同时修改
await lockContract.editLock(lockId, newAmount, newUnlockDate);
```

---

### 6. 编辑锁仓描述 (editLockDescription)

修改锁仓的描述信息。

```typescript
function editLockDescription(
  lockId: bigint,
  description: string
): Promise<TransactionReceipt>
```

---

### 7. 转移锁仓所有权 (transferLockOwnership)

将锁仓的所有权转移给其他地址。

```typescript
function transferLockOwnership(
  lockId: bigint,
  newOwner: string
): Promise<TransactionReceipt>
```

---

### 8. 放弃锁仓所有权 (renounceLockOwnership)

放弃锁仓所有权（转移到0地址，不可恢复）。

```typescript
function renounceLockOwnership(lockId: bigint): Promise<TransactionReceipt>
```

---

## 查询接口

### 1. 获取锁仓信息

```typescript
// 根据ID获取锁仓信息
function getLockById(lockId: bigint): Promise<Lock>

// 根据索引获取锁仓信息
function getLockAt(index: bigint): Promise<Lock>

// 获取总锁仓数量
function getTotalLockCount(): Promise<bigint>
```

### 2. 查询用户锁仓

```typescript
// 获取用户所有普通代币锁仓
function normalLocksForUser(user: string): Promise<Lock[]>

// 获取用户所有LP代币锁仓
function lpLocksForUser(user: string): Promise<Lock[]>

// 获取用户锁仓总数
function totalLockCountForUser(user: string): Promise<bigint>

// 获取用户普通代币锁仓数量
function normalLockCountForUser(user: string): Promise<bigint>

// 获取用户LP代币锁仓数量
function lpLockCountForUser(user: string): Promise<bigint>

// 根据索引获取用户锁仓
function normalLockForUserAtIndex(user: string, index: bigint): Promise<Lock>
function lpLockForUserAtIndex(user: string, index: bigint): Promise<Lock>
```

### 3. 查询代币锁仓

```typescript
// 获取代币的所有锁仓（分页）
function getLocksForToken(
  token: string,
  start: bigint,
  end: bigint
): Promise<Lock[]>

// 获取代币的锁仓总数
function totalLockCountForToken(token: string): Promise<bigint>
```

### 4. 查询累计锁仓信息

```typescript
// 获取代币的累计锁仓信息
function cumulativeLockInfo(token: string): Promise<CumulativeLockInfo>

// 获取所有LP代币锁仓数量
function allLpTokenLockedCount(): Promise<bigint>

// 获取所有普通代币锁仓数量
function allNormalTokenLockedCount(): Promise<bigint>

// 获取所有代币锁仓总数
function totalTokenLockedCount(): Promise<bigint>

// 获取LP代币累计信息（分页）
function getCumulativeLpTokenLockInfo(start: bigint, end: bigint): Promise<CumulativeLockInfo[]>

// 获取普通代币累计信息（分页）
function getCumulativeNormalTokenLockInfo(start: bigint, end: bigint): Promise<CumulativeLockInfo[]>
```

### 5. 查询可解锁数量

```typescript
// 查询线性释放锁仓的可解锁数量
function withdrawableTokens(lockId: bigint): Promise<bigint>
```

**注意：** 对于普通锁仓，如果时间未到返回0，时间到了可以全部解锁。

---

## 事件监听

### 事件列表

```typescript
// 锁仓创建
event LockAdded(
  uint256 indexed id,
  address token,
  address owner,
  uint256 amount,
  uint256 unlockDate
)

// 锁仓更新
event LockUpdated(
  uint256 indexed id,
  address token,
  address owner,
  uint256 newAmount,
  uint256 newUnlockDate
)

// 锁仓移除（完全解锁）
event LockRemoved(
  uint256 indexed id,
  address token,
  address owner,
  uint256 amount,
  uint256 unlockedAt
)

// 线性释放解锁
event LockVested(
  uint256 indexed id,
  address token,
  address owner,
  uint256 amount,
  uint256 remaining,
  uint256 timestamp
)

// 锁仓描述变更
event LockDescriptionChanged(uint256 indexed lockId)

// 锁仓所有权变更
event LockOwnerChanged(
  uint256 indexed lockId,
  address owner,
  address newOwner
)
```

### 事件监听示例

```typescript
// 监听锁仓创建
lockContract.on("LockAdded", (id, token, owner, amount, unlockDate) => {
  console.log("新锁仓创建:", { id, token, owner, amount, unlockDate });
});

// 监听锁仓解锁
lockContract.on("LockVested", (id, token, owner, amount, remaining, timestamp) => {
  console.log("锁仓部分解锁:", { id, amount, remaining });
});

// 监听特定用户的锁仓事件
const filter = lockContract.filters.LockAdded(null, null, userAddress);
lockContract.on(filter, (id, token, owner, amount, unlockDate) => {
  // 处理事件
});
```

---

## 前端功能模块

### 1. 锁仓创建模块

**功能描述：**
- 支持普通锁仓和线性释放锁仓两种模式
- 代币选择和数量输入
- 时间选择器（解锁日期/TGE日期）
- 参数验证和预览
- 代币授权和锁仓创建

**UI组件：**
- 锁仓类型选择（普通/线性释放）
- 代币选择器
- 数量输入框
- 日期时间选择器
- 线性释放参数输入（TGE百分比、周期、周期百分比）
- 描述输入框
- 创建按钮

**状态管理：**
- 当前选择的代币
- 代币余额
- 授权状态
- 表单验证状态

---

### 2. 我的锁仓模块

**功能描述：**
- 显示用户所有锁仓列表
- 区分普通代币锁仓和LP代币锁仓
- 显示锁仓状态（已解锁/未解锁/部分解锁）
- 锁仓详情查看
- 解锁操作

**UI组件：**
- 锁仓列表（卡片或表格）
- 锁仓状态标签
- 进度条（线性释放锁仓）
- 解锁按钮
- 详情弹窗

**数据展示：**
- 锁仓ID
- 代币信息（名称、符号、图标）
- 锁仓数量
- 已解锁数量
- 剩余数量
- 解锁时间/TGE时间
- 锁仓描述

---

### 3. 锁仓管理模块

**功能描述：**
- 编辑锁仓（增加金额、延长解锁时间）
- 编辑描述
- 转移所有权
- 放弃所有权

**UI组件：**
- 编辑表单
- 操作按钮组
- 确认对话框

---

### 4. 锁仓查询模块

**功能描述：**
- 按代币查询锁仓
- 按用户查询锁仓
- 全局锁仓统计
- 锁仓排行榜

**UI组件：**
- 搜索框
- 筛选器
- 统计卡片
- 数据表格

---

### 5. 批量锁仓模块

**功能描述：**
- 批量创建线性释放锁仓
- 支持CSV导入用户列表
- 统一设置释放规则

**UI组件：**
- 文件上传
- 用户列表编辑器
- 批量操作按钮

---

## 代码示例

### 完整的锁仓创建示例

```typescript
import { ethers } from 'ethers';
import BTY_LOCK_ABI from './abis/BTYLock.json';
import ERC20_ABI from './abis/ERC20.json';

const CONTRACT_ADDRESS = "0x..."; // 合约地址
const RPC_URL = "http://192.168.3.239:8546"; // 或主网RPC

// 初始化Provider和Signer
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = await provider.getSigner(); // 需要用户连接钱包

// 初始化合约
const lockContract = new ethers.Contract(
  CONTRACT_ADDRESS,
  BTY_LOCK_ABI,
  signer
);

// 创建普通锁仓
async function createNormalLock(
  tokenAddress: string,
  amount: string,
  unlockDate: number,
  description: string
) {
  try {
    const userAddress = await signer.getAddress();
    const amountWei = ethers.parseEther(amount);
    
    // 1. 检查代币余额
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );
    const balance = await tokenContract.balanceOf(userAddress);
    if (balance < amountWei) {
      throw new Error("代币余额不足");
    }
    
    // 2. 检查授权额度
    const allowance = await tokenContract.allowance(userAddress, CONTRACT_ADDRESS);
    if (allowance < amountWei) {
      // 需要授权
      const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, amountWei);
      await approveTx.wait();
      console.log("授权成功");
    }
    
    // 3. 创建锁仓
    const tx = await lockContract.lock(
      userAddress,
      tokenAddress,
      false, // 不是LP代币
      amountWei,
      unlockDate,
      description
    );
    
    // 4. 等待交易确认
    const receipt = await tx.wait();
    
    // 5. 从事件中获取锁仓ID
    const lockAddedEvent = receipt.logs.find(
      log => lockContract.interface.parseLog(log)?.name === "LockAdded"
    );
    const lockId = lockAddedEvent.args.id;
    
    console.log("锁仓创建成功，ID:", lockId.toString());
    return lockId;
    
  } catch (error) {
    console.error("创建锁仓失败:", error);
    throw error;
  }
}

// 创建线性释放锁仓
async function createVestingLock(
  tokenAddress: string,
  amount: string,
  tgeDate: number,
  tgePercent: number, // 0-100
  cycleDays: number,
  cyclePercent: number, // 0-100
  description: string
) {
  const userAddress = await signer.getAddress();
  const amountWei = ethers.parseEther(amount);
  const tgeBps = Math.floor(tgePercent * 100); // 转换为基点
  const cycle = cycleDays * 86400; // 转换为秒
  const cycleBps = Math.floor(cyclePercent * 100);
  
  // 验证参数
  if (tgeBps + cycleBps > 10000) {
    throw new Error("TGE百分比和周期百分比总和不能超过100%");
  }
  
  // 授权代币
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const allowance = await tokenContract.allowance(userAddress, CONTRACT_ADDRESS);
  if (allowance < amountWei) {
    await tokenContract.approve(CONTRACT_ADDRESS, amountWei);
  }
  
  // 创建锁仓
  const tx = await lockContract.vestingLock(
    userAddress,
    tokenAddress,
    false,
    amountWei,
    tgeDate,
    tgeBps,
    cycle,
    cycleBps,
    description
  );
  
  const receipt = await tx.wait();
  const lockId = receipt.logs[0].args.id;
  return lockId;
}

// 查询用户锁仓列表
async function getUserLocks(userAddress: string) {
  const normalLocks = await lockContract.normalLocksForUser(userAddress);
  const lpLocks = await lockContract.lpLocksForUser(userAddress);
  
  return {
    normal: normalLocks.map(formatLock),
    lp: lpLocks.map(formatLock)
  };
}

// 格式化锁仓数据
function formatLock(lock: any) {
  return {
    id: lock.id.toString(),
    token: lock.token,
    owner: lock.owner,
    amount: ethers.formatEther(lock.amount),
    lockDate: new Date(Number(lock.lockDate) * 1000),
    unlockDate: new Date(Number(lock.tgeDate) * 1000),
    unlockedAmount: ethers.formatEther(lock.unlockedAmount),
    remainingAmount: ethers.formatEther(lock.amount - lock.unlockedAmount),
    isVesting: lock.tgeBps > 0,
    tgePercent: Number(lock.tgeBps) / 100,
    cycle: Number(lock.cycle),
    cyclePercent: Number(lock.cycleBps) / 100,
    description: lock.description
  };
}

// 解锁锁仓
async function unlockLock(lockId: string) {
  // 先查询可解锁数量
  const withdrawable = await lockContract.withdrawableTokens(lockId);
  
  if (withdrawable === 0n) {
    throw new Error("当前没有可解锁的代币");
  }
  
  const tx = await lockContract.unlock(lockId);
  await tx.wait();
  console.log("解锁成功");
}

// 查询可解锁数量
async function getWithdrawable(lockId: string) {
  const withdrawable = await lockContract.withdrawableTokens(lockId);
  return ethers.formatEther(withdrawable);
}
```

---

## 错误处理

### 常见错误及处理

```typescript
// 错误处理示例
try {
  await lockContract.lock(...);
} catch (error: any) {
  if (error.reason) {
    // 合约revert错误
    switch (error.reason) {
      case "Invalid token":
        alert("无效的代币地址");
        break;
      case "Amount should be greater than 0":
        alert("锁仓数量必须大于0");
        break;
      case "Unlock date should be in the future":
        alert("解锁时间必须是将来的时间");
        break;
      case "You are not the owner of this lock":
        alert("您不是该锁仓的所有者");
        break;
      case "It is not time to unlock":
        alert("还未到解锁时间");
        break;
      default:
        alert(`错误: ${error.reason}`);
    }
  } else if (error.code === 4001) {
    // 用户拒绝交易
    alert("用户取消了交易");
  } else if (error.code === -32603) {
    // RPC错误
    alert("网络错误，请稍后重试");
  } else {
    console.error("未知错误:", error);
    alert("操作失败，请查看控制台");
  }
}
```

---

## 前端开发建议

### 1. 状态管理
- 使用 Redux/Zustand 管理锁仓列表和用户状态
- 缓存锁仓数据，减少链上查询

### 2. 性能优化
- 使用分页加载锁仓列表
- 使用 WebSocket 监听事件，实时更新UI
- 批量查询多个锁仓信息

### 3. 用户体验
- 显示交易进度（pending/confirming/confirmed）
- 提供交易历史记录
- 支持撤销未确认的交易（如果网络支持）

### 4. 安全建议
- 验证所有用户输入
- 检查代币授权状态
- 显示交易详情让用户确认
- 防止重复提交

---

## 完整的前端功能清单

### 必须实现的功能
- [ ] 连接钱包（MetaMask/Web3钱包）
- [ ] 创建普通锁仓
- [ ] 创建线性释放锁仓
- [ ] 查看我的锁仓列表
- [ ] 解锁锁仓
- [ ] 查询锁仓详情
- [ ] 查询可解锁数量

### 推荐实现的功能
- [ ] 编辑锁仓（增加金额、延长解锁时间）
- [ ] 编辑锁仓描述
- [ ] 转移锁仓所有权
- [ ] 批量创建锁仓
- [ ] 按代币查询锁仓
- [ ] 锁仓统计信息
- [ ] 事件通知（锁仓到期提醒）

### 可选功能
- [ ] 锁仓历史记录
- [ ] 导出锁仓数据
- [ ] 锁仓分享功能
- [ ] 多语言支持

---

## 联系与支持

如有问题，请参考：
- 合约源码：`contracts/BTYLock.sol`
- 测试用例：`test/BTYLock.test.js`
- 部署脚本：`scripts/deploy.js`

---

**文档版本**: 1.0  
**最后更新**: 2024-01-14
