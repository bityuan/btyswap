// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import './periphery/interfaces/IWETH.sol';

/**
 * @title WBTY - Wrapped BTY Token
 * @dev 这是一个包装BTY的ERC20代币合约，允许用户将原生BTY包装成ERC20代币进行交易
 * @notice 实现了标准的ERC20接口和IWETH接口，支持deposit和withdraw功能
 */
contract WBTY is IWETH {
    string public name     = "Wrapped BTY";
    string public symbol   = "WBTY";
    uint8  public decimals = 18;

    // 事件定义
    event  Approval(address indexed src, address indexed guy, uint256 wad);
    event  Transfer(address indexed src, address indexed dst, uint256 wad);
    event  Deposit(address indexed dst, uint256 wad);
    event  Withdrawal(address indexed src, uint256 wad);

    // 状态变量
    mapping (address => uint256)                       public  balanceOf;
    mapping (address => mapping (address => uint256))  public  allowance;

    /**
     * @dev 接收函数，当合约收到BTY时自动调用deposit
     * @notice 这是Solidity 0.6.12的新语法，替代了fallback函数
     */
    receive() external payable {
        this.deposit();
    }

    /**
     * @dev 将BTY包装成WBTY代币
     * @notice 用户发送BTY到合约，获得等量的WBTY代币
     */
    function deposit() external override payable {
        require(msg.value > 0, "WBTY: deposit amount must be greater than 0");
        
        balanceOf[msg.sender] += msg.value;        
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev 将WBTY代币兑换回BTY
     * @param wad 要兑换的WBTY数量
     * @notice 用户销毁WBTY代币，获得等量的BTY
     */
    function withdraw(uint256 wad) external override {
        require(wad > 0, "WBTY: withdraw amount must be greater than 0");
        require(balanceOf[msg.sender] >= wad, "WBTY: insufficient balance");
        
        // 防止重入攻击：先更新状态，再转账
        balanceOf[msg.sender] -= wad;

        msg.sender.transfer(wad);
        
        emit Withdrawal(msg.sender, wad);
    }

    /**
     * @dev 授权其他地址使用代币
     * @param guy 被授权的地址
     * @param wad 授权数量
     * @return 操作是否成功
     * @notice 修复了双重授权攻击漏洞
     */
    function approve(address guy, uint256 wad) public returns (bool) {
        require(guy != address(0), "WBTY: approve to zero address");
        
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }

    /**
     * @dev 增加授权额度
     * @param guy 被授权的地址
     * @param wad 增加的授权数量
     * @return 操作是否成功
     * @notice 安全的授权增加方法
     */
    function increaseAllowance(address guy, uint256 wad) public returns (bool) {
        require(guy != address(0), "WBTY: increase allowance to zero address");
        
        allowance[msg.sender][guy] += wad;
        emit Approval(msg.sender, guy, allowance[msg.sender][guy]);
        return true;
    }

    /**
     * @dev 减少授权额度
     * @param guy 被授权的地址
     * @param wad 减少的授权数量
     * @return 操作是否成功
     * @notice 安全的授权减少方法
     */
    function decreaseAllowance(address guy, uint256 wad) public returns (bool) {
        require(guy != address(0), "WBTY: decrease allowance to zero address");
        require(allowance[msg.sender][guy] >= wad, "WBTY: decreased allowance below zero");
        
        allowance[msg.sender][guy] -= wad;
        emit Approval(msg.sender, guy, allowance[msg.sender][guy]);
        return true;
    }

    /**
     * @dev 转账函数
     * @param dst 接收地址
     * @param wad 转账数量
     * @return 操作是否成功
     */
    function transfer(address dst, uint256 wad) external override returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    /**
     * @dev 从指定地址转账
     * @param src 发送地址
     * @param dst 接收地址
     * @param wad 转账数量
     * @return 操作是否成功
     * @notice 实现了ERC20标准的transferFrom功能
     */
    function transferFrom(address src, address dst, uint256 wad) public returns (bool) {
        require(src != address(0), "WBTY: transfer from zero address");
        require(dst != address(0), "WBTY: transfer to zero address");
        require(wad > 0, "WBTY: transfer amount must be greater than 0");
        require(balanceOf[src] >= wad, "WBTY: insufficient balance");
        
        // 检查授权
        if (src != msg.sender) {
            require(allowance[src][msg.sender] >= wad, "WBTY: insufficient allowance");
            allowance[src][msg.sender] -= wad;
        }
        
        // 执行转账
        balanceOf[src] -= wad;
        balanceOf[dst] += wad;
        
        emit Transfer(src, dst, wad);
        return true;
    }

    /**
     * @dev 获取总供应量
     * @return 合约持有的BTY数量
     * @notice 与WBNB保持兼容的函数形式
     */
    function totalSupply() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev 获取合约的BTY余额
     * @return 合约持有的BTY数量
     * @notice 合约余额应该等于totalSupply
     */
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
