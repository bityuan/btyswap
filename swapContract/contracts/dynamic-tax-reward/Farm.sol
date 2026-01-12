// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./RewardPool.sol";

interface IUniswapV2Router02 {
    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountToken, uint amountETH);
}

/**
 * @title Farm
 * @dev 锁仓奖励合约 - 专门服务于动态税率合约的LP奖励系统
 * 
 * 职责：
 * - 接收并锁定 PXX/BTY LP Token
 * - 记录用户锁仓数量与时间
 * - 负责奖励计算与分发（使用 MasterChef 的 accRewardPerShare 模型）
 * - 从 RewardPool 拉取奖励
 * 
 * 核心机制：
 * - accRewardPerShare：累积到当前区块为止，每1单位LP对应的奖励数量
 * - rewardDebt：用户已结算的奖励基准
 * - 每次操作前先 updatePool() 更新全局状态
 * - 最短锁仓时间：7天
 */
contract Farm is Ownable {
    using SafeMath for uint256;
    
    // 常量
    uint256 public constant MIN_LOCK_TIME = 7 days; // 最短锁仓时间
    uint256 private constant ACC_REWARD_PRECISION = 1e12; // accRewardPerShare 精度
    
    // 合约地址
    address public lpToken;        // PXX/BTY LP Token 地址
    address public rewardToken;    // 奖励代币地址（PXX Token）
    RewardPool public rewardPool; // 奖励池合约
    address public routerAddress;  // Router 地址（用于移除流动性）
    
    // 全局状态（MasterChef 模型）
    uint256 public accRewardPerShare; // 累积奖励每份额（精度：1e12）
    uint256 public lastRewardBlock;   // 上一次结算奖励的区块
    uint256 public lastAvailableReward; // 上一次的可用奖励（用于计算新增奖励）
    
    // 总质押量
    uint256 public totalStaked; // 总质押的 LP 数量
    
    // 用户信息
    struct UserInfo {
        uint256 amount;       // 当前质押的 LP 数量
        uint256 rewardDebt;  // 用户已结算的奖励基准（amount * accRewardPerShare / ACC_REWARD_PRECISION）
        uint256 depositTime; // 最近一次存入 LP 的时间戳
    }
    
    mapping(address => UserInfo) public userInfo; // 用户信息映射
    
    // 事件
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Claim(address indexed user, uint256 amount);
    event PoolUpdated(uint256 accRewardPerShare, uint256 lastRewardBlock);
    
    /**
     * @dev 构造函数
     * @param _lpToken PXX/BTY LP Token 地址
     * @param _rewardToken 奖励代币地址（PXX Token）
     * @param _rewardPool 奖励池合约地址
     * @param _routerAddress Router 地址
     */
    constructor(
        address _lpToken,
        address _rewardToken,
        address _rewardPool,
        address _routerAddress
    ) public {
        require(_lpToken != address(0), "LP token address cannot be zero");
        require(_rewardToken != address(0), "Reward token address cannot be zero");
        require(_rewardPool != address(0), "Reward pool address cannot be zero");
        require(_routerAddress != address(0), "Router address cannot be zero");
        
        lpToken = _lpToken;
        rewardToken = _rewardToken;
        rewardPool = RewardPool(_rewardPool);
        routerAddress = _routerAddress;
        
        lastRewardBlock = block.number;
    }
    
    /**
     * @dev 更新奖励池状态（MasterChef 模型核心逻辑）
     * 每次发生以下操作之一时，必须先调用此函数：
     * - 用户 deposit
     * - 用户 withdraw
     * - 用户 claim
     * - 有新奖励进入 RewardPool
     */
    function updatePool() public {
        if (totalStaked == 0) {
            lastRewardBlock = block.number;
            lastAvailableReward = rewardPool.availableReward();
            return;
        }
        
        // 获取当前可用奖励（从 RewardPool）
        uint256 currentAvailableReward = rewardPool.availableReward();
        
        // 计算新增奖励（从上次updatePool到现在新增的奖励）
        uint256 newReward = 0;
        if (currentAvailableReward > lastAvailableReward) {
            newReward = currentAvailableReward.sub(lastAvailableReward);
        }
        
        // 计算从上次更新到现在的区块数
        uint256 blocksPassed = block.number.sub(lastRewardBlock);
        
        if (newReward > 0 && blocksPassed > 0 && totalStaked > 0) {
            // 按区块线性释放新增奖励
            // 每次updatePool时，将新增奖励按比例分配给所有质押者
            // accRewardPerShare += (newReward * ACC_REWARD_PRECISION) / totalStaked
            accRewardPerShare = accRewardPerShare.add(
                newReward.mul(ACC_REWARD_PRECISION).div(totalStaked)
            );
        }
        
        lastRewardBlock = block.number;
        lastAvailableReward = currentAvailableReward;
        
        emit PoolUpdated(accRewardPerShare, lastRewardBlock);
    }
    
    /**
     * @dev 质押 LP Token（锁仓）
     * @param amount 质押的 LP 数量
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        
        // 更新奖励池状态
        updatePool();
        
        UserInfo storage user = userInfo[msg.sender];
        
        // 如果用户已有质押，先结算奖励
        if (user.amount > 0) {
            uint256 pending = pendingReward(msg.sender);
            if (pending > 0) {
                // 从 RewardPool 拉取奖励
                rewardPool.pullReward(msg.sender, pending);
                emit Claim(msg.sender, pending);
            }
        }
        
        // 转移 LP Token
        IERC20(lpToken).transferFrom(msg.sender, address(this), amount);
        
        // 更新用户信息
        user.amount = user.amount.add(amount);
        user.rewardDebt = user.amount.mul(accRewardPerShare).div(ACC_REWARD_PRECISION);
        
        // 只有第一次deposit时才设置锁仓时间，后续deposit不重置（锁仓时间从第一次deposit开始计算）
        if (user.depositTime == 0) {
            user.depositTime = block.timestamp;
        }
        
        // 更新总质押量
        totalStaked = totalStaked.add(amount);
        
        emit Deposit(msg.sender, amount);
    }
    
    /**
     * @dev 提取 LP Token（解锁）
     * @param amount 提取的 LP 数量
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= amount, "Insufficient staked amount");
        
        // 检查锁仓时间
        require(
            block.timestamp >= user.depositTime.add(MIN_LOCK_TIME),
            "Lock time not reached"
        );
        
        // 更新奖励池状态
        updatePool();
        
        // 结算并发放奖励
        uint256 pending = pendingReward(msg.sender);
        if (pending > 0) {
            rewardPool.pullReward(msg.sender, pending);
            emit Claim(msg.sender, pending);
        }
        
        // 更新用户信息
        user.amount = user.amount.sub(amount);
        user.rewardDebt = user.amount.mul(accRewardPerShare).div(ACC_REWARD_PRECISION);
        
        // 如果全部提取，重置 depositTime
        if (user.amount == 0) {
            user.depositTime = 0;
        }
        
        // 更新总质押量
        totalStaked = totalStaked.sub(amount);
        
        // 移除流动性（将 LP Token 转换为 Token 和 BTY）
        IERC20(lpToken).approve(routerAddress, amount);
        IUniswapV2Router02(routerAddress).removeLiquidityETH(
            rewardToken,
            amount,
            0,
            0,
            msg.sender,
            block.timestamp
        );
        
        emit Withdraw(msg.sender, amount);
    }
    
    /**
     * @dev 领取奖励
     */
    function claim() external {
        // 检查锁仓时间
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount > 0, "No staked amount");
        require(
            block.timestamp >= user.depositTime.add(MIN_LOCK_TIME),
            "Lock time not reached"
        );
        
        // 更新奖励池状态
        updatePool();
        
        // 计算待领取奖励
        uint256 pending = pendingReward(msg.sender);
        require(pending > 0, "No reward to claim");
        
        // 从 RewardPool 拉取奖励
        rewardPool.pullReward(msg.sender, pending);
        
        // 更新用户 rewardDebt
        user.rewardDebt = user.amount.mul(accRewardPerShare).div(ACC_REWARD_PRECISION);
        
        emit Claim(msg.sender, pending);
    }
    
    /**
     * @dev 计算用户待领取奖励
     * @param user 用户地址
     * @return 待领取奖励数量
     */
    function pendingReward(address user) public view returns (uint256) {
        UserInfo memory _user = userInfo[user];
        
        if (_user.amount == 0) {
            return 0;
        }
        
        // 计算当前的 accRewardPerShare（模拟 updatePool）
        uint256 currentAccRewardPerShare = accRewardPerShare;
        uint256 currentAvailableReward = rewardPool.availableReward();
        
        // 计算新增奖励
        uint256 newReward = 0;
        if (currentAvailableReward > lastAvailableReward) {
            newReward = currentAvailableReward.sub(lastAvailableReward);
        }
        
        uint256 blocksPassed = block.number.sub(lastRewardBlock);
        
        if (newReward > 0 && blocksPassed > 0 && totalStaked > 0) {
            currentAccRewardPerShare = currentAccRewardPerShare.add(
                newReward.mul(ACC_REWARD_PRECISION).div(totalStaked)
            );
        }
        
        // 计算待领取奖励
        // pending = (user.amount * currentAccRewardPerShare / ACC_REWARD_PRECISION) - user.rewardDebt
        uint256 userReward = _user.amount.mul(currentAccRewardPerShare).div(ACC_REWARD_PRECISION);
        
        if (userReward <= _user.rewardDebt) {
            return 0;
        }
        
        return userReward.sub(_user.rewardDebt);
    }
    
    /**
     * @dev 获取用户信息
     * @param user 用户地址
     * @return amount 质押数量
     * @return rewardDebt 已结算奖励基准
     * @return depositTime 锁仓时间
     * @return pending 待领取奖励
     */
    function getUserInfo(address user) external view returns (
        uint256 amount,
        uint256 rewardDebt,
        uint256 depositTime,
        uint256 pending
    ) {
        UserInfo memory _user = userInfo[user];
        return (
            _user.amount,
            _user.rewardDebt,
            _user.depositTime,
            pendingReward(user)
        );
    }
    
    /**
     * @dev 紧急提取（仅 owner，用于紧急情况）
     * 注意：此函数会跳过锁仓时间检查，仅用于紧急情况
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 amount = totalStaked;
        if (amount > 0) {
            totalStaked = 0;
            IERC20(lpToken).transfer(owner(), amount);
        }
    }
}

