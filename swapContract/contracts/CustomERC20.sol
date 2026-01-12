// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CustomERC20
 * @dev 自定义ERC20代币合约，支持增发功能
 */
contract CustomERC20 is ERC20, Ownable {
    bool public mintable;
    uint8 private _decimals;
    
    /**
     * @dev 构造函数
     * @param name 代币名称
     * @param symbol 代币符号
     * @param decimals_ 小数位数
     * @param initialSupply 初始供应量
     * @param _mintable 是否支持增发
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initialSupply,
        bool _mintable
    ) public ERC20(name, symbol) {
        mintable = _mintable;
        
        // 设置小数位数
        _decimals = decimals_;
        
        // 铸造初始供应量给部署者
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply * (10 ** uint256(decimals_)));
        }
    }
    
    /**
     * @dev 重写decimals函数
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev 增发代币（只有owner可以调用，且需要启用增发功能）
     * @param to 接收地址
     * @param amount 增发数量
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(mintable, "Token is not mintable");
        _mint(to, amount);
    }
    
    /**
     * @dev 销毁代币
     * @param amount 销毁数量
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev 从指定地址销毁代币（只有owner可以调用）
     * @param from 销毁地址
     * @param amount 销毁数量
     */
    function burnFrom(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
    
    /**
     * @dev 禁用增发功能（只有owner可以调用）
     */
    function disableMinting() public onlyOwner {
        mintable = false;
    }
    
    /**
     * @dev 启用增发功能（只有owner可以调用）
     */
    function enableMinting() public onlyOwner {
        mintable = true;
    }
}
