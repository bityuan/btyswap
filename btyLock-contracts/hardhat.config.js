require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    bityuan: {
      url: "https://mainnet.bityuan.com/eth",
      chainId: 2999,
      accounts: ["0x私钥"], // 部署账户私钥
      gas: 5000000,
      gasPrice: 1000000000, // 1 gwei
    },
    bityuan_testnet: {
      url: "http://192.168.3.239:8546",
      chainId: 6999,
      accounts: ["0x私钥"], // 部署账户私钥
      gas: 5000000,
      gasPrice: 1000000000, // 1 gwei
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
