const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署 BTY 锁仓合约...\n");

  // 获取网络信息
  const network = await ethers.provider.getNetwork();
  const networkName = hre.network.name;
  
  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("部署账户地址:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 部署 BTYLock 合约
  console.log("正在部署 BTYLock 合约...");
  const BTYLock = await ethers.getContractFactory("BTYLock");
  
  // 显式设置 gas 参数，避免自动估算导致的错误
  // 注意：某些 RPC 节点可能不支持自动估算 gas，所以显式设置 gasLimit
  const btyLock = await BTYLock.deploy({
    gasLimit: 5000000, // 设置一个足够大的 gas limit
  });
  
  await btyLock.waitForDeployment();
  const btyLockAddress = await btyLock.getAddress();

  console.log("✅ BTYLock 合约部署成功!");
  console.log("合约地址:", btyLockAddress);
  console.log("部署交易哈希:", btyLock.deploymentTransaction()?.hash);
  console.log("\n");

  // 验证合约信息
  console.log("验证合约信息...");
  const totalLockCount = await btyLock.getTotalLockCount();
  console.log("当前锁仓数量:", totalLockCount.toString());
  console.log("总LP代币锁仓数量:", (await btyLock.allLpTokenLockedCount()).toString());
  console.log("总普通代币锁仓数量:", (await btyLock.allNormalTokenLockedCount()).toString());

  // 保存部署信息
  const deploymentInfo = {
    network: networkName,
    chainId: network.chainId.toString(),
    contractAddress: btyLockAddress,
    deployer: deployer.address,
    deployTime: new Date().toISOString(),
    transactionHash: btyLock.deploymentTransaction()?.hash,
  };

  console.log("\n部署信息:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log("\n部署完成!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
