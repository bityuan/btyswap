const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("使用账户部署:", deployer.address);

  try {
    console.log("\n=== 开始正确的部署流程 ===");

    // 第一步：获取PancakePair的creation code并计算INIT_CODE_PAIR_HASH
    console.log("\n--- 第一步：计算INIT_CODE_PAIR_HASH ---");
    
    const PancakePair = await ethers.getContractFactory("PancakePair");
    const pairCreationCode = PancakePair.bytecode;
    const initCodePairHash = ethers.utils.keccak256(pairCreationCode);
    
    console.log("PancakePair creation code长度:", pairCreationCode.length);
    console.log("计算得到的INIT_CODE_PAIR_HASH:", initCodePairHash);
    
    // 验证计算是否正确
    console.log("\n验证计算:");
    const PancakeFactory = await ethers.getContractFactory("PancakeFactory");
    const factoryCreationCode = PancakeFactory.bytecode;
    console.log("Factory creation code长度:", factoryCreationCode.length);
    
    // 第二步：动态更新PancakeLibrary中的INIT_CODE_PAIR_HASH
    console.log("\n--- 第二步：更新PancakeLibrary中的INIT_CODE_PAIR_HASH ---");
    
    const libraryPath = path.join(__dirname, '../contracts/periphery/libraries/PancakeLibrary.sol');
    let libraryContent = fs.readFileSync(libraryPath, 'utf8');
    
    // 使用正则表达式查找并替换INIT_CODE_PAIR_HASH
    const hashRegex = /hex'([a-fA-F0-9]{64})'/;
    const match = libraryContent.match(hashRegex);
    
    if (match) {
      const currentHash = '0x' + match[1];
      console.log("当前PancakeLibrary中的INIT_CODE_PAIR_HASH:", currentHash);
      
      if (currentHash !== initCodePairHash) {
        // 替换INIT_CODE_PAIR_HASH
        const newLibraryContent = libraryContent.replace(
          `hex'${match[1]}'`,
          `hex'${initCodePairHash.substring(2)}'`
        );
        
        // 备份原文件
        const backupPath = libraryPath + '.backup';
        fs.writeFileSync(backupPath, libraryContent);
        console.log("原文件已备份到:", backupPath);
        
        // 写入新内容
        fs.writeFileSync(libraryPath, newLibraryContent);
        console.log("✅ PancakeLibrary.sol中的INIT_CODE_PAIR_HASH已更新");
        console.log("旧值:", currentHash);
        console.log("新值:", initCodePairHash);
      } else {
        console.log("✅ PancakeLibrary.sol中的INIT_CODE_PAIR_HASH已经是正确的值");
      }
    } else {
      console.log("❌ 在PancakeLibrary.sol中未找到INIT_CODE_PAIR_HASH");
      throw new Error("无法找到INIT_CODE_PAIR_HASH，请检查PancakeLibrary.sol文件");
    }
    
    // 第三步：重新编译合约
    console.log("\n--- 第三步：重新编译合约 ---");
    console.log("正在重新编译...");
    
    // 执行实际的重新编译
    const { execSync } = require('child_process');
    try {
      execSync('npx hardhat compile', { stdio: 'inherit' });
      console.log("✅ 合约重新编译完成");
    } catch (compileError) {
      console.log("❌ 重新编译失败:", compileError.message);
      throw new Error("合约重新编译失败，请检查错误信息");
    }
    
    // 第四步：部署合约
    console.log("\n--- 第四步：部署合约 ---");
    
    // 1. 部署WBTY
    console.log("部署WBTY...");
    const WBTY = await ethers.getContractFactory("WBTY");
    let wbtyDeployTx;
    let wbtyAddress;
    
    try {
      wbtyDeployTx = await WBTY.deploy();
      await wbtyDeployTx.deployed();
      wbtyAddress = wbtyDeployTx.address;
    } catch (error) {
      if (error.message.includes("Transaction hash mismatch")) {
        console.log("检测到Bityuan链哈希不匹配，但合约可能已部署成功");
        console.log("实际交易哈希:", error.transactionHash);
        // 尝试从交易哈希获取合约地址
        const receipt = await ethers.provider.getTransactionReceipt(error.transactionHash);
        if (receipt && receipt.contractAddress) {
          console.log("从交易收据获取到合约地址:", receipt.contractAddress);
          wbtyAddress = receipt.contractAddress;
          // 创建一个合约实例用于后续使用
          wbtyDeployTx = new ethers.Contract(wbtyAddress, WBTY.interface, deployer);
        } else {
          throw new Error("无法获取WBTY合约地址");
        }
      } else {
        throw error;
      }
    }
    console.log("WBTY 已部署到:", wbtyAddress);
    
    // 2. 部署PancakeFactory
    console.log("部署PancakeFactory...");
    let factoryDeployTx;
    let factoryAddress;
    
    try {
      factoryDeployTx = await PancakeFactory.deploy(deployer.address);
      await factoryDeployTx.deployed();
      factoryAddress = factoryDeployTx.address;
    } catch (error) {
      if (error.message.includes("Transaction hash mismatch")) {
        console.log("检测到Bityuan链哈希不匹配，但合约可能已部署成功");
        console.log("实际交易哈希:", error.transactionHash);
        const receipt = await ethers.provider.getTransactionReceipt(error.transactionHash);
        if (receipt && receipt.contractAddress) {
          console.log("从交易收据获取到合约地址:", receipt.contractAddress);
          factoryAddress = receipt.contractAddress;
          // 创建一个合约实例用于后续使用
          factoryDeployTx = new ethers.Contract(factoryAddress, PancakeFactory.interface, deployer);
        } else {
          throw new Error("无法获取PancakeFactory合约地址");
        }
      } else {
        throw error;
      }
    }
    console.log("PancakeFactory 已部署到:", factoryAddress);
    
    // 3. 验证Factory的INIT_CODE_PAIR_HASH
    console.log("\n验证Factory的INIT_CODE_PAIR_HASH:");
    const factory = PancakeFactory.attach(factoryAddress);
    const factoryInitCodeHash = await factory.INIT_CODE_PAIR_HASH();
    console.log("Factory合约的INIT_CODE_PAIR_HASH:", factoryInitCodeHash);
    console.log("计算得到的INIT_CODE_PAIR_HASH:", initCodePairHash);
    console.log("是否匹配:", factoryInitCodeHash === initCodePairHash);
    
    // 4. 部署PancakeRouter
    console.log("部署PancakeRouter...");
    const PancakeRouter = await ethers.getContractFactory("PancakeRouter");
    let routerDeployTx;
    let routerAddress;
    
    try {
      routerDeployTx = await PancakeRouter.deploy(factoryAddress, wbtyAddress);
      await routerDeployTx.deployed();
      routerAddress = routerDeployTx.address;
    } catch (error) {
      if (error.message.includes("Transaction hash mismatch")) {
        console.log("检测到Bityuan链哈希不匹配，但合约可能已部署成功");
        console.log("实际交易哈希:", error.transactionHash);
        const receipt = await ethers.provider.getTransactionReceipt(error.transactionHash);
        if (receipt && receipt.contractAddress) {
          console.log("从交易收据获取到合约地址:", receipt.contractAddress);
          routerAddress = receipt.contractAddress;
          // 创建一个合约实例用于后续使用
          routerDeployTx = new ethers.Contract(routerAddress, PancakeRouter.interface, deployer);
        } else {
          throw new Error("无法获取PancakeRouter合约地址");
        }
      } else {
        throw error;
      }
    }
    console.log("PancakeRouter 已部署到:", routerAddress);
    
    // 5. 部署Multicall
    console.log("部署Multicall...");
    const Multicall = await ethers.getContractFactory("Multicall");
    let multicallDeployTx;
    let multicallAddress;
    
    try {
      multicallDeployTx = await Multicall.deploy();
      await multicallDeployTx.deployed();
      multicallAddress = multicallDeployTx.address;
    } catch (error) {
      if (error.message.includes("Transaction hash mismatch")) {
        console.log("检测到Bityuan链哈希不匹配，但合约可能已部署成功");
        console.log("实际交易哈希:", error.transactionHash);
        const receipt = await ethers.provider.getTransactionReceipt(error.transactionHash);
        if (receipt && receipt.contractAddress) {
          console.log("从交易收据获取到合约地址:", receipt.contractAddress);
          multicallAddress = receipt.contractAddress;
          // 创建一个合约实例用于后续使用
          multicallDeployTx = new ethers.Contract(multicallAddress, Multicall.interface, deployer);
        } else {
          throw new Error("无法获取Multicall合约地址");
        }
      } else {
        throw error;
      }
    }
    console.log("Multicall 已部署到:", multicallAddress);
    
    // 输出部署信息
    console.log("\n=== 部署完成 ===");
    console.log("网络: Bityuan");
    console.log("部署者:", deployer.address);
    console.log("WBTY:", wbtyAddress);
    console.log("Factory:", factoryAddress);
    console.log("Router:", routerAddress);
    console.log("Multicall:", multicallAddress);
    console.log("INIT_CODE_PAIR_HASH:", initCodePairHash);
    
    // 输出前端配置信息
    console.log("\n=== 前端配置信息 ===");
    console.log("// 前端配置文件中的合约地址配置");
    console.log(`FACTORY_ADDRESS: "${factoryAddress}"`);
    console.log(`ROUTER_ADDRESS: "${routerAddress}"`);
    console.log(`WBTY_ADDRESS: "${wbtyAddress}"`);
    console.log(`MULTICALL_ADDRESS: "${multicallAddress}"`);
    console.log(`INIT_CODE_PAIR_HASH: "${initCodePairHash}"`);
    
    // 保存部署信息到文件
    const deploymentInfo = {
      network: "Bityuan",
      deployer: deployer.address,
      contracts: {
        WBTY: wbtyAddress,
        Factory: factoryAddress,
        Router: routerAddress,
        Multicall: multicallAddress
      },
      initCodePairHash: initCodePairHash,
      timestamp: new Date().toISOString()
    };
    
    const deploymentPath = path.join(__dirname, '../deployment-info.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n部署信息已保存到:", deploymentPath);

  } catch (error) {
    console.error("部署过程中出现错误:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  });
