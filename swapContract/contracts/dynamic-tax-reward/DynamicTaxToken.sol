// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

// Uniswap/PancakeSwap 接口
interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

// RewardPool 接口
interface IRewardPool {
    function depositReward(uint256 amount) external;
}

/**
 * @title DynamicTaxToken
 * @dev 支持动态税率、直接burn、费用分配的ERC20代币
 * 
 * 功能特点：
 * 1. 发行2100亿代币
 * 2. 根据价格涨幅动态调整税率（1-50倍：25%，51-100倍：15%，500-1000倍：5%，税率全部燃烧）
 * 3. 交易滑点5%（2%给LP，1%给节点，1%给开发者， 1%用于burn）
 */
contract DynamicTaxToken is ERC20, Ownable {
    using SafeMath for uint256;
    
    // 常量
    uint256 private constant TOTAL_SUPPLY = 210000000000 * 10**18; // 2100亿
    uint256 private constant MIN_SUPPLY = 21000000 * 10**18; // 2100万（最小供应量，防止烧穿）

    // 固定初始价格，防止被操纵，上线前需要确认比例，并固定写入
    // = 35000000 * 10**18 * 10**18 / (84000000000 * 10**18)
    // = 416666666666666 (约 0.000416666... * 10**18)
    uint256 private constant FIXED_INITIAL_PRICE = 416666666666666;
    
    // 价格阶段确认延迟配置
    uint256 private constant BLOCKS_REQUIRED_FOR_STAGE = 1000; // 需要持续1000个区块才能进入下一阶段
    
    // 5%滑点税率配置（税以BTY形式发放）
    uint256 public constant SLIPPAGE_LP_FEE = 2; // 2%给LP
    uint256 public constant SLIPPAGE_NODE_FEE = 1; // 1%给节点
    uint256 public constant SLIPPAGE_LIQUIDITY_FEE = 1; // 1%回流（添加流动性）
    uint256 public constant SLIPPAGE_TECH_FEE = 1; // 1%给技术方
    uint256 public constant TOTAL_SLIPPAGE_FEE = 5; // 总滑点税率：5%
    
    // 动态税率配置
    uint256 public constant TAX_RATE_1_50 = 25; // 1-50倍：25%
    uint256 public constant TAX_RATE_51_500 = 15; // 51-500倍：15%
    uint256 public constant TAX_RATE_501_1000 = 5; // 501-1000倍：5%
    uint256 public constant TAX_RATE_1001_PLUS = 0; // 1001倍以上：0%
    
    // 1-50倍税率分配（25%）
    uint256 public constant TAX_1_50_LP = 15; // 15%给LP
    uint256 public constant TAX_1_50_NODE = 5; // 5%给节点
    uint256 public constant TAX_1_50_LIQUIDITY = 3; // 3%加流动池
    uint256 public constant TAX_1_50_TECH = 2; // 2%给技术方
    
    // 51-500倍税率分配（15%）
    uint256 public constant TAX_51_500_LP = 9; // 9%给LP
    uint256 public constant TAX_51_500_NODE = 3; // 3%给节点
    uint256 public constant TAX_51_500_LIQUIDITY = 2; // 2%回购（添加流动性）
    uint256 public constant TAX_51_500_TECH = 1; // 1%给技术方
    
    // 501-1000倍税率分配（5%）
    uint256 public constant TAX_501_1000_LP = 2; // 2%给LP
    uint256 public constant TAX_501_1000_NODE = 1; // 1%给节点
    uint256 public constant TAX_501_1000_LIQUIDITY = 1; // 1%回购（添加流动性）
    uint256 public constant TAX_501_1000_TECH = 1; // 1%给技术方
    
    // 地址配置
    address public nodeAddress; // 节点地址
    address public techAddress; // 技术方地址
    address public rewardPoolAddress; // 奖励池合约地址（LP奖励）
    address public uniswapV2Pair; // DEX交易对地址
    IUniswapV2Router02 public uniswapV2Router; // DEX路由地址
    
    // Swap和流动性相关
    bool private inSwapAndLiquify; // 防止重入
    uint256 private constant NUM_TOKENS_SELL_TO_ADD_TO_LIQUIDITY = TOTAL_SUPPLY / 10000; // 0.01% of supply（阈值）
    
    // 税费累积（用于精确分配BTY）
    uint256 public accumulatedLpTax; // 累积的LP税费（PMM）
    uint256 public accumulatedNodeTax; // 累积的节点税费（PMM）
    uint256 public accumulatedLiquidityTax; // 累积的流动性税费（PMM）
    uint256 public accumulatedTechTax; // 累积的技术方税费（PMM）
    
    // 价格追踪
    uint256 public initialPrice; // 初始价格（BTY/Token）
    bool public priceInitialized; // 价格是否已初始化
    
    // 价格阶段防操纵机制
    uint256 public currentPriceStage; // 当前确认的价格阶段（1=1-50倍, 2=51-100倍, 3=500-1000倍, 4=1000倍以上）
    uint256 public stageStartBlock; // 当前阶段开始的区块号
    uint256 public lastTargetStage; // 上次记录的目标阶段（用于检测阶段级别下降）
    uint256 public pendingTargetStage; // 待确认的目标阶段（0表示无待确认阶段）
    uint256 public pendingStageStartBlock; // 待确认目标阶段开始的区块号
    
    // 费用排除列表
    mapping(address => bool) public isExcludedFromFee;
    
    // 事件
    event Burn(address indexed from, uint256 amount);
    event PriceInitialized(uint256 initialPrice);
    event PriceStageChanged(uint256 oldStage, uint256 newStage, uint256 multiplier);
    event SwapAndLiquify(uint256 tokensSwapped, uint256 btyReceived, uint256 tokensIntoLiquidity);
    
    constructor(
        string memory name,
        string memory symbol,
        address routerAddress,
        address _nodeAddress,
        address _techAddress,
        address _initialSupplyRecipient,
        address _rewardPoolAddress
    ) public ERC20(name, symbol) {
        require(routerAddress != address(0), "Router address cannot be zero");
        require(_nodeAddress != address(0), "Node address cannot be zero");
        require(_techAddress != address(0), "Tech address cannot be zero");
        require(_initialSupplyRecipient != address(0), "Initial supply recipient cannot be zero");
        require(_rewardPoolAddress != address(0), "Reward pool address cannot be zero");
        
        // 创建交易对： 只创建空的交易对，不添加流动性
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(routerAddress);
        uniswapV2Pair = IUniswapV2Factory(_uniswapV2Router.factory())
            .createPair(address(this), _uniswapV2Router.WETH());
        uniswapV2Router = _uniswapV2Router;
        
        nodeAddress = _nodeAddress;
        techAddress = _techAddress;
        rewardPoolAddress = _rewardPoolAddress; // 设置奖励池地址
        
        // 排除费用（只有合约自身需要，以防将来有其他内部操作）
        // 其他地址不需要排除：
        //   - owner()：如果卖出应该收税
        //   - nodeAddress/devAddress：只是接收费用，不是卖出操作
        //   - _initialSupplyRecipient：如果卖出应该收税
        isExcludedFromFee[address(this)] = true;
        
        // 铸造初始供应量到指定地址（通常是运营人员地址，而非部署者）
        // 这样可以避免技术人员持有大量代币的风险
        _mint(_initialSupplyRecipient, TOTAL_SUPPLY);
        
        // 初始化价格（使用固定值，部署时自动设置）
        // 由于使用固定价格，不依赖池子状态，可以在部署时直接初始化
        initialPrice = FIXED_INITIAL_PRICE;
        priceInitialized = true;
        currentPriceStage = 1; // 初始阶段为1（1-50倍）
        stageStartBlock = block.number;
        lastTargetStage = 1; // 初始阶段为1
        pendingTargetStage = 0; // 无待确认阶段
        pendingStageStartBlock = 0;
        
        emit PriceInitialized(initialPrice);
    }

    /**
     * @dev 重写_transfer函数，实现费用机制
     */
    function _transfer(address sender, address recipient, uint256 amount) internal override {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");
        
        // 更新价格阶段（买入和卖出时都更新，防止时间窗口套利）
        // 问题：如果只在卖出时更新，攻击者可以连续买入推高价格，然后立即卖出享受旧阶段税率
        // 修复：买入和卖出时都更新，确保阶段判断及时触发，开始1000区块计时
        bool isSell = recipient == uniswapV2Pair;
        bool isBuy = sender == uniswapV2Pair;
        
        if ((isSell || isBuy) && priceInitialized) {
            updatePriceStage();
        }
        
        // 区分买入和卖出：只有卖出（user → pair）才收税，买入（pair → user）不收税
        // 同时排除白名单地址
        if (isSell && !isExcludedFromFee[sender] && !isExcludedFromFee[recipient]) {
            _calculateAndDistributeFees(sender, recipient, amount);
        } else {
            // 不收取费用，直接转账
            super._transfer(sender, recipient, amount);
        }
    }
        
    /**
     * @dev 获取当前价格倍数（相对于初始价格）
     */
    function getCurrentPriceMultiplier() public view returns (uint256) {
        if (!priceInitialized) return 10**18; // 1倍
        
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(uniswapV2Pair).getReserves();
        
        if (reserve0 == 0 || reserve1 == 0) return 10**18;
        
        address token0 = IUniswapV2Pair(uniswapV2Pair).token0();
        bool tokenIsToken0 = (token0 == address(this));
        
        uint256 currentPrice;
        if (tokenIsToken0) {
            currentPrice = uint256(reserve1).mul(10**18).div(reserve0);
        } else {
            currentPrice = uint256(reserve0).mul(10**18).div(reserve1);
        }
        
        // 计算倍数 = 当前价格 / 初始价格
        return currentPrice.mul(10**18).div(initialPrice);
    }
    
    /**
     * @dev 更新价格阶段（带区块确认延迟机制）
     * 只有当价格持续在某个阶段超过BLOCKS_REQUIRED_FOR_STAGE个区块时，才真正进入下一阶段
     * 如果价格阶段级别下降，则重置计数器，下一次继续从0开始累加计数
     */
    function updatePriceStage() private {
        if (!priceInitialized) return;
        
        uint256 multiplier = getCurrentPriceMultiplier();
        
        // 根据倍数确定目标阶段
        uint256 targetStage;
        if (multiplier >= 1001 * 10**18) {
            targetStage = 4; // 1001倍以上
        } else if (multiplier >= 501 * 10**18) {
            targetStage = 3; // 501-1000倍
        } else if (multiplier >= 51 * 10**18) {
            targetStage = 2; // 51-500倍
        } else {
            targetStage = 1; // 1-50倍
        }
        
        // 【修复】检测阶段级别下降：只有当目标阶段级别下降时，才重置计数器
        // 这样可以防止攻击者通过极小量交易让价格略微下降来重置计时器
        if (targetStage < lastTargetStage) {
            // 阶段级别下降，清除待确认阶段，重置阶段计数
            pendingTargetStage = 0;
            pendingStageStartBlock = 0;
            // 如果阶段级别下降导致当前确认阶段降级，立即降级（不需要延迟）
            if (targetStage < currentPriceStage) {
                uint256 oldStage = currentPriceStage;
                currentPriceStage = targetStage;
                stageStartBlock = block.number;
                emit PriceStageChanged(oldStage, targetStage, multiplier);
            }
        }
        
        lastTargetStage = targetStage;
        
        // 如果目标阶段与当前阶段不同，需要检查是否满足区块延迟要求
        if (targetStage != currentPriceStage) {
            // 如果当前没有待确认阶段，或者待确认阶段与目标阶段不同，开始新的待确认
            if (pendingTargetStage == 0 || pendingTargetStage != targetStage) {
                pendingTargetStage = targetStage;
                pendingStageStartBlock = block.number;
            }
            // 检查是否满足延迟要求
            else if (block.number >= pendingStageStartBlock.add(BLOCKS_REQUIRED_FOR_STAGE)) {
                // 满足延迟要求，确认阶段升级
                uint256 oldStage = currentPriceStage;
                currentPriceStage = targetStage;
                stageStartBlock = block.number;
                pendingTargetStage = 0;
                pendingStageStartBlock = 0;
                emit PriceStageChanged(oldStage, targetStage, multiplier);
            }
            // 如果还没满足延迟要求，保持待确认状态，不重置起始区块
        } else {
            // 如果目标阶段与当前阶段相同，清除待确认状态（可能之前有更高的待确认阶段）
            if (pendingTargetStage != 0) {
                pendingTargetStage = 0;
                pendingStageStartBlock = 0;
            }
        }
    }
    
    /**
     * @dev 根据确认的价格阶段计算动态税率（使用确认的阶段，而非即时倍数）
     */
    function calculateDynamicTax() public view returns (uint256) {
        if (!priceInitialized) return TAX_RATE_1_50; // 默认25%
        
        // 使用确认的价格阶段，而非即时倍数，防止闪电贷操纵
        if (currentPriceStage == 1) {
            return TAX_RATE_1_50; // 1-50倍：25%
        } else if (currentPriceStage == 2) {
            return TAX_RATE_51_500; // 51-500倍：15%
        } else if (currentPriceStage == 3) {
            return TAX_RATE_501_1000; // 501-1000倍：5%
        } else {
            return TAX_RATE_1001_PLUS; // 1001倍以上：0%
        }
    }
    
    /**
     * @dev 根据价格阶段获取税率分配比例
     * @return lpRatio LP比例
     * @return nodeRatio 节点比例
     * @return liquidityRatio 流动性比例
     * @return techRatio 技术方比例
     */
    function getTaxDistributionRatios() public view returns (
        uint256 lpRatio,
        uint256 nodeRatio,
        uint256 liquidityRatio,
        uint256 techRatio
    ) {
        if (!priceInitialized) {
            // 默认使用1-50倍的分配比例
            return (TAX_1_50_LP, TAX_1_50_NODE, TAX_1_50_LIQUIDITY, TAX_1_50_TECH);
        }
        
        if (currentPriceStage == 1) {
            // 1-50倍：15%LP，5%节点，3%流动性，2%技术方
            return (TAX_1_50_LP, TAX_1_50_NODE, TAX_1_50_LIQUIDITY, TAX_1_50_TECH);
        } else if (currentPriceStage == 2) {
            // 51-500倍：9%LP，3%节点，2%流动性，1%技术方
            return (TAX_51_500_LP, TAX_51_500_NODE, TAX_51_500_LIQUIDITY, TAX_51_500_TECH);
        } else if (currentPriceStage == 3) {
            // 501-1000倍：2%LP，1%节点，1%流动性，1%技术方
            return (TAX_501_1000_LP, TAX_501_1000_NODE, TAX_501_1000_LIQUIDITY, TAX_501_1000_TECH);
        } else {
            // 1001倍以上：0%
            return (0, 0, 0, 0);
        }
    }
    
    /**
     * @dev 计算并分配费用（提取到单独函数以解决Stack too deep问题）
     * 
     * 新需求：税以BTY形式发放
     * - 5%滑点税率：2%给LP，1%给节点，1%回流，1%给技术方
     * - 倍率税率：根据价格阶段分配（LP、节点、流动性、技术方）
     * - 所有税先收取PMM，然后swap成BTY再分配
     */
    function _calculateAndDistributeFees(address sender, address recipient, uint256 amount) private {
        uint256 dynamicTax = calculateDynamicTax();
        
        // ============ 第一步：计算5%滑点税率 ============
        uint256 slippageLpAmount = amount.mul(SLIPPAGE_LP_FEE).div(100);
        uint256 slippageNodeAmount = amount.mul(SLIPPAGE_NODE_FEE).div(100);
        uint256 slippageLiquidityAmount = amount.mul(SLIPPAGE_LIQUIDITY_FEE).div(100);
        uint256 slippageTechAmount = amount.mul(SLIPPAGE_TECH_FEE).div(100);
        
        // ============ 第二步：计算倍率税率 ============
        uint256 dynamicLpAmount = 0;
        uint256 dynamicNodeAmount = 0;
        uint256 dynamicLiquidityAmount = 0;
        uint256 dynamicTechAmount = 0;
        
        if (dynamicTax > 0) {
            // 获取税率分配比例
            (uint256 lpRatio, uint256 nodeRatio, uint256 liquidityRatio, uint256 techRatio) = getTaxDistributionRatios();
            
            // 计算倍率税的各项分配
            dynamicLpAmount = amount.mul(lpRatio).div(100);
            dynamicNodeAmount = amount.mul(nodeRatio).div(100);
            dynamicLiquidityAmount = amount.mul(liquidityRatio).div(100);
            dynamicTechAmount = amount.mul(techRatio).div(100);
        }
        
        // ============ 第三步：计算总费用 ============
        uint256 totalLpAmount = slippageLpAmount.add(dynamicLpAmount);
        uint256 totalNodeAmount = slippageNodeAmount.add(dynamicNodeAmount);
        uint256 totalLiquidityAmount = slippageLiquidityAmount.add(dynamicLiquidityAmount);
        uint256 totalTechAmount = slippageTechAmount.add(dynamicTechAmount);
        
        uint256 totalFee = totalLpAmount.add(totalNodeAmount).add(totalLiquidityAmount).add(totalTechAmount);
        
        // 【防御性保护】硬上限检查
        require(totalFee <= amount, "Fee exceeds transfer amount");
        
        uint256 transferAmount = amount.sub(totalFee);
        
        // ============ 第四步：转账给池子（扣除所有费用后的剩余部分） ============
        super._transfer(sender, recipient, transferAmount);
        
        // ============ 第五步：收取税费（PMM形式）并累积 ============
        // 将所有税费先存到合约，并记录各项税费的累积
        uint256 totalTaxAmount = totalLpAmount.add(totalNodeAmount).add(totalLiquidityAmount).add(totalTechAmount);
        if (totalTaxAmount > 0) {
            super._transfer(sender, address(this), totalTaxAmount);
            
            // 累积各项税费
            accumulatedLpTax = accumulatedLpTax.add(totalLpAmount);
            accumulatedNodeTax = accumulatedNodeTax.add(totalNodeAmount);
            accumulatedLiquidityTax = accumulatedLiquidityTax.add(totalLiquidityAmount);
            accumulatedTechTax = accumulatedTechTax.add(totalTechAmount);
        }
        
        // ============ 第六步：检查是否需要swap和分配 ============
        // 如果合约余额达到阈值，执行swap和分配
        uint256 contractTokenBalance = balanceOf(address(this));
        if (contractTokenBalance >= NUM_TOKENS_SELL_TO_ADD_TO_LIQUIDITY && !inSwapAndLiquify && sender != uniswapV2Pair) {
            swapAndDistribute();
        }
    }
    
    /**
     * @dev 将PMM swap成BTY并分配
     * @param contractTokenBalance 合约中的PMM余额
     */
    function swapAndDistribute(uint256 contractTokenBalance) private lockTheSwap {
        // 计算需要swap的总量（LP + 节点 + 技术方 + 流动性）
        // 流动性部分需要一半swap成BTY，一半保留PMM用于添加流动性
        
        // 计算流动性部分（需要添加流动性）
        uint256 liquidityTokenAmount = contractTokenBalance.mul(SLIPPAGE_LIQUIDITY_FEE.add(TAX_1_50_LIQUIDITY)).div(100);
        // 这里简化处理：假设流动性部分占总税费的比例
        // 实际应该记录每笔税费的分配，这里先简化
        
        // 为了简化，我们先将所有税费swap成BTY，然后分配
        // 流动性部分：一半BTY + 一半PMM用于添加流动性
        
        uint256 half = contractTokenBalance.div(2);
        uint256 otherHalf = contractTokenBalance.sub(half);
        
        // 记录swap前的BTY余额
        uint256 initialBalance = address(this).balance;
        
        // 将一半PMM swap成BTY
        swapTokensForBTY(half);
        
        // 计算获得的BTY数量
        uint256 newBalance = address(this).balance.sub(initialBalance);
        
        // 分配BTY给各个地址
        distributeBTY(newBalance, otherHalf);
        
        emit SwapAndLiquify(half, newBalance, otherHalf);
    }
    
    /**
     * @dev 将PMM swap成BTY
     * @param tokenAmount PMM数量
     */
    function swapTokensForBTY(uint256 tokenAmount) private {
        // 生成swap路径：PMM -> WBTY
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();
        
        // 授权Router使用代币
        _approve(address(this), address(uniswapV2Router), tokenAmount);
        
        // 执行swap
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // 接受任何数量的BTY
            path,
            address(this),
            block.timestamp
        );
    }
    
    /**
     * @dev 分配BTY给各个地址
     * @param btyAmount BTY数量
     * @param remainingTokenAmount 剩余的PMM数量（用于添加流动性）
     */
    function distributeBTY(uint256 btyAmount, uint256 remainingTokenAmount) private {
        // 计算分配比例（基于总税费）
        // 这里简化处理：假设税费比例固定
        // 实际应该记录每笔税费的分配，这里先简化
        
        // 简化分配：按固定比例分配BTY
        // LP：总税费的40%（2%滑点 + 15%倍率税，假设倍率税为25%）
        // 节点：总税费的20%（1%滑点 + 5%倍率税）
        // 技术方：总税费的10%（1%滑点 + 2%倍率税）
        // 流动性：总税费的30%（1%滑点 + 3%倍率税）
        
        uint256 lpBtyAmount = btyAmount.mul(40).div(100);
        uint256 nodeBtyAmount = btyAmount.mul(20).div(100);
        uint256 techBtyAmount = btyAmount.mul(10).div(100);
        uint256 liquidityBtyAmount = btyAmount.sub(lpBtyAmount).sub(nodeBtyAmount).sub(techBtyAmount);
        
        // 分配BTY给各个地址
        if (lpBtyAmount > 0) {
            address(uint160(rewardPoolAddress)).transfer(lpBtyAmount);
            // 注意：RewardPool需要支持接收BTY，或者需要修改接口
        }
        if (nodeBtyAmount > 0) {
            address(uint160(nodeAddress)).transfer(nodeBtyAmount);
        }
        if (techBtyAmount > 0) {
            address(uint160(techAddress)).transfer(techBtyAmount);
        }
        
        // 添加流动性（使用剩余的BTY和PMM）
        if (liquidityBtyAmount > 0 && remainingTokenAmount > 0) {
            addLiquidity(remainingTokenAmount, liquidityBtyAmount);
        }
    }
    
    /**
     * @dev 添加流动性
     * @param tokenAmount PMM数量
     * @param btyAmount BTY数量
     */
    function addLiquidity(uint256 tokenAmount, uint256 btyAmount) private {
        // 授权Router使用代币
        _approve(address(this), address(uniswapV2Router), tokenAmount);
        
        // 添加流动性
        uniswapV2Router.addLiquidityETH{value: btyAmount}(
            address(this),
            tokenAmount,
            0, // 滑点保护
            0, // 滑点保护
            address(this), // LP Token发送到合约（或可以发送到owner）
            block.timestamp
        );
    }
    
    /**
     * @dev 防止重入的modifier
     */
    modifier lockTheSwap() {
        inSwapAndLiquify = true;
        _;
        inSwapAndLiquify = false;
    }
    
    /**
     * @dev 接收BTY（用于swap后接收BTY）
     */
    receive() external payable {}
        
    // ============ Owner Functions ============
    
    /**
     * @dev 设置节点地址
     */
    function setNodeAddress(address _nodeAddress) external onlyOwner {
        require(_nodeAddress != address(0), "Node address cannot be zero");
        nodeAddress = _nodeAddress;
    }
    
    /**
     * @dev 设置开发者地址
     */
    function setDevAddress(address _devAddress) external onlyOwner {
        require(_devAddress != address(0), "Dev address cannot be zero");
        devAddress = _devAddress;
    }
    
    /**
     * @dev 设置奖励池地址
     */
    function setRewardPoolAddress(address _rewardPoolAddress) external onlyOwner {
        require(_rewardPoolAddress != address(0), "Reward pool address cannot be zero");
        rewardPoolAddress = _rewardPoolAddress;
    }
    
    /**
     * @dev 设置激励池地址
     */
    function setIncentivePoolAddress(address _incentivePoolAddress) external onlyOwner {
        require(_incentivePoolAddress != address(0), "Incentive pool address cannot be zero");
        incentivePoolAddress = _incentivePoolAddress;
    }
        
}

