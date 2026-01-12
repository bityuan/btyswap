// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title RewardPool
 * @dev 奖励池合约 - 专门服务于动态税率合约的LP奖励系统
 * 
 * 职责：
 * - 接收来自 PXX ERC20 合约的奖励 Token（卖出税中的LP费用）
 * - 作为奖励资金的唯一存储地址
 * - 不参与任何奖励计算
 * - 不直接向用户转账
 * - 仅授权 Farm 合约提取奖励
 * 
 * 设计原则：
 * - 职责单一（资金托管）
 * - 不包含业务逻辑
 * - 不记录用户信息
 * - 不关心 LP、不关心锁仓、不关心时间
 */
contract RewardPool is Ownable {
    using SafeMath for uint256;
    
    // 奖励代币地址（PXX Token）
    address public rewardToken;
    
    // 授权的 Farm 合约地址（唯一授权）
    address public farmAddress;
    
    // 统计信息
    uint256 public totalDeposited;    // 总存入量
    uint256 public totalDistributed;  // 总分配量
    
    // 事件
    event RewardDeposited(address indexed from, uint256 amount);
    event RewardPulled(address indexed to, uint256 amount);
    event FarmAddressSet(address indexed oldFarm, address indexed newFarm);
    
    /**
     * @dev 构造函数
     * @param _rewardToken 奖励代币地址（PXX Token）
     */
    constructor(address _rewardToken) public {
        require(_rewardToken != address(0), "Reward token address cannot be zero");
        rewardToken = _rewardToken;
    }
    
    /**
     * @dev 设置 Farm 合约地址（仅 owner，只能设置一次）
     * @param _farmAddress Farm 合约地址
     * 
     * 注意：Farm address can only be set once, immutable binding
     * 这是不可升级的奖励池，一旦设置 Farm 地址后，无法修改
     */
    function setFarmAddress(address _farmAddress) external onlyOwner {
        require(_farmAddress != address(0), "Farm address cannot be zero");
        require(farmAddress == address(0), "Farm address already set");
        
        address oldFarm = farmAddress;
        farmAddress = _farmAddress;
        
        emit FarmAddressSet(oldFarm, _farmAddress);
    }
    
    /**
     * @dev 存入奖励（由 PXX Token 合约调用）
     * @param amount 存入的奖励数量
     * 
     * 注意：此函数只负责记账，不负责转账
     * Token 合约已经通过 _transfer 将代币转给了 RewardPool
     * 这里只需要更新统计信息即可
     */
    function depositReward(uint256 amount) external {
        require(msg.sender == rewardToken, "Only reward token can deposit");
        require(amount > 0, "Amount must be greater than zero");
        
        // 验证实际余额是否增加（防止记账错误）
        // 注意：这里不进行转账，因为 Token 合约已经通过 _transfer 转过了
        // 只需要更新统计信息
        totalDeposited = totalDeposited.add(amount);
        
        emit RewardDeposited(msg.sender, amount);
    }
    
    /**
     * @dev 提取奖励（仅 Farm 合约可调用）
     * @param to 接收奖励的地址
     * @param amount 提取的奖励数量
     * 
     * 防御性检查：
     * - 检查记账余额（totalDeposited - totalDistributed）
     * - 检查实际余额（防止误转、升级迁移等情况导致的不一致）
     */
    function pullReward(address to, uint256 amount) external {
        require(msg.sender == farmAddress, "Only farm can pull reward");
        require(to != address(0), "To address cannot be zero");
        require(amount > 0, "Amount must be greater than zero");
        
        // 双重校验：记账余额和实际余额
        uint256 available = availableReward();
        uint256 balance_ = balance();
        require(amount <= available, "Exceeds accounting");
        require(amount <= balance_, "Insufficient balance");
        
        // 转移奖励代币
        IERC20(rewardToken).transfer(to, amount);
        
        totalDistributed = totalDistributed.add(amount);
        
        emit RewardPulled(to, amount);
    }
    
    /**
     * @dev 获取可用奖励数量
     * @return 可用奖励数量
     */
    function availableReward() public view returns (uint256) {
        return totalDeposited.sub(totalDistributed);
    }
    
    /**
     * @dev 获取奖励池余额（实际余额，可能因为其他原因与统计不一致）
     * @return 奖励池实际余额
     */
    function balance() public view returns (uint256) {
        return IERC20(rewardToken).balanceOf(address(this));
    }
    
    /**
     * @dev 获取奖励池统计信息（只读函数，零风险）
     * @return deposited 总存入量
     * @return distributed 总分配量
     * @return balance_ 实际余额
     */
    function stats() external view returns (
        uint256 deposited,
        uint256 distributed,
        uint256 balance_
    ) {
        return (totalDeposited, totalDistributed, balance());
    }
}

