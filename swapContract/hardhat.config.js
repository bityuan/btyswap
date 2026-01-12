require("@nomiclabs/hardhat-ethers");

// 强制使用特定版本的Solidity编译器
process.env.SOLC_VERSION = "0.6.12";

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  // 添加合约过滤配置，忽略示例文件
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  networks: {
    bityuan: {
      url: "https://mainnet.bityuan.com/eth",
      chainId: 2999,
      accounts: ["0x............................................"], // 部署账户私钥
    },
  },
};
