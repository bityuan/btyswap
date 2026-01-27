const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BTYLock 合约测试", function () {
  let btyLock;
  let token;
  let owner;
  let user1;
  let user2;
  let MockERC20;

  // 部署 Mock ERC20 代币用于测试
  async function deployMockERC20(name, symbol, supply) {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy(name, symbol, supply);
    return mockToken;
  }

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // 部署 BTYLock 合约
    const BTYLock = await ethers.getContractFactory("BTYLock");
    btyLock = await BTYLock.deploy();
    await btyLock.waitForDeployment();

    // 部署 Mock ERC20 代币
    const mockERC20Factory = await ethers.getContractFactory("MockERC20");
    token = await mockERC20Factory.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
    await token.waitForDeployment();

    // 给用户分配代币
    await token.transfer(user1.address, ethers.parseEther("10000"));
    await token.transfer(user2.address, ethers.parseEther("10000"));
  });

  describe("部署", function () {
    it("应该成功部署合约", async function () {
      expect(await btyLock.getAddress()).to.be.properAddress;
    });

    it("初始锁仓数量应该为0", async function () {
      expect(await btyLock.getTotalLockCount()).to.equal(0);
    });
  });

  describe("普通锁仓 (lock)", function () {
    it("应该成功创建普通锁仓", async function () {
      const amount = ethers.parseEther("1000");
      const unlockDate = (await time.latest()) + 86400; // 1天后

      await token.connect(user1).approve(await btyLock.getAddress(), amount);

      const tx = await btyLock
        .connect(user1)
        .lock(
          user1.address,
          await token.getAddress(),
          false,
          amount,
          unlockDate,
          "测试锁仓"
        );

      await expect(tx).to.emit(btyLock, "LockAdded");

      const lockId = await btyLock.getTotalLockCount();
      expect(lockId).to.equal(1);

      const lock = await btyLock.getLockById(1000000); // ID_PADDING = 1000000
      expect(lock.owner).to.equal(user1.address);
      expect(lock.amount).to.equal(amount);
      expect(lock.token).to.equal(await token.getAddress());
    });

    it("应该拒绝无效的锁仓参数", async function () {
      const amount = ethers.parseEther("1000");
      const pastDate = (await time.latest()) - 86400; // 过去的时间

      await token.connect(user1).approve(await btyLock.getAddress(), amount);

      await expect(
        btyLock
          .connect(user1)
          .lock(
            user1.address,
            await token.getAddress(),
            false,
            amount,
            pastDate,
            "测试锁仓"
          )
      ).to.be.revertedWith("Unlock date should be in the future");
    });

    it("应该拒绝零金额锁仓", async function () {
      const unlockDate = (await time.latest()) + 86400;

      await expect(
        btyLock
          .connect(user1)
          .lock(
            user1.address,
            await token.getAddress(),
            false,
            0,
            unlockDate,
            "测试锁仓"
          )
      ).to.be.revertedWith("Amount should be greater than 0");
    });
  });

  describe("线性释放锁仓 (vestingLock)", function () {
    it("应该成功创建线性释放锁仓", async function () {
      const amount = ethers.parseEther("1000");
      const tgeDate = (await time.latest()) + 86400; // 1天后
      const tgeBps = 2000; // 20%
      const cycle = 86400; // 1天
      const cycleBps = 1000; // 10%

      await token.connect(user1).approve(await btyLock.getAddress(), amount);

      const tx = await btyLock
        .connect(user1)
        .vestingLock(
          user1.address,
          await token.getAddress(),
          false,
          amount,
          tgeDate,
          tgeBps,
          cycle,
          cycleBps,
          "线性释放锁仓"
        );

      await expect(tx).to.emit(btyLock, "LockAdded");

      const lock = await btyLock.getLockById(1000000);
      expect(lock.tgeBps).to.equal(tgeBps);
      expect(lock.cycle).to.equal(cycle);
      expect(lock.cycleBps).to.equal(cycleBps);
    });

    it("应该拒绝无效的线性释放参数", async function () {
      const amount = ethers.parseEther("1000");
      const tgeDate = (await time.latest()) + 86400;
      const tgeBps = 2000;
      const cycle = 0; // 无效的周期
      const cycleBps = 1000;

      await token.connect(user1).approve(await btyLock.getAddress(), amount);

      await expect(
        btyLock
          .connect(user1)
          .vestingLock(
            user1.address,
            await token.getAddress(),
            false,
            amount,
            tgeDate,
            tgeBps,
            cycle,
            cycleBps,
            "线性释放锁仓"
          )
      ).to.be.revertedWith("Invalid cycle");
    });
  });

  describe("解锁 (unlock)", function () {
    it("应该成功解锁普通锁仓", async function () {
      const amount = ethers.parseEther("1000");
      const unlockDate = (await time.latest()) + 86400;

      await token.connect(user1).approve(await btyLock.getAddress(), amount);
      await btyLock
        .connect(user1)
        .lock(
          user1.address,
          await token.getAddress(),
          false,
          amount,
          unlockDate,
          "测试锁仓"
        );

      // 时间前进到解锁日期
      await time.increase(86401);

      const balanceBefore = await token.balanceOf(user1.address);
      await btyLock.connect(user1).unlock(1000000);
      const balanceAfter = await token.balanceOf(user1.address);

      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("应该拒绝在解锁日期前解锁", async function () {
      const amount = ethers.parseEther("1000");
      const unlockDate = (await time.latest()) + 86400;

      await token.connect(user1).approve(await btyLock.getAddress(), amount);
      await btyLock
        .connect(user1)
        .lock(
          user1.address,
          await token.getAddress(),
          false,
          amount,
          unlockDate,
          "测试锁仓"
        );

      await expect(
        btyLock.connect(user1).unlock(1000000)
      ).to.be.revertedWith("It is not time to unlock");
    });

    it("应该拒绝非所有者解锁", async function () {
      const amount = ethers.parseEther("1000");
      const unlockDate = (await time.latest()) + 86400;

      await token.connect(user1).approve(await btyLock.getAddress(), amount);
      await btyLock
        .connect(user1)
        .lock(
          user1.address,
          await token.getAddress(),
          false,
          amount,
          unlockDate,
          "测试锁仓"
        );

      await time.increase(86401);

      await expect(
        btyLock.connect(user2).unlock(1000000)
      ).to.be.revertedWith("You are not the owner of this lock");
    });
  });

  describe("线性释放解锁", function () {
    it("应该可以部分解锁线性释放锁仓", async function () {
      const amount = ethers.parseEther("1000");
      const tgeDate = (await time.latest()) + 86400;
      const tgeBps = 2000; // 20% = 200 tokens
      const cycle = 86400; // 1天
      const cycleBps = 1000; // 10% = 100 tokens per cycle

      await token.connect(user1).approve(await btyLock.getAddress(), amount);
      await btyLock
        .connect(user1)
        .vestingLock(
          user1.address,
          await token.getAddress(),
          false,
          amount,
          tgeDate,
          tgeBps,
          cycle,
          cycleBps,
          "线性释放锁仓"
        );

      // 时间前进到 TGE 日期
      await time.increase(86401);

      const balanceBefore = await token.balanceOf(user1.address);
      await btyLock.connect(user1).unlock(1000000);
      const balanceAfter = await token.balanceOf(user1.address);

      // 应该解锁 TGE 部分 (20%)
      const expectedTgeAmount = (amount * BigInt(tgeBps)) / BigInt(10000);
      expect(balanceAfter - balanceBefore).to.equal(expectedTgeAmount);
    });
  });

  describe("编辑锁仓 (editLock)", function () {
    it("应该可以增加锁仓金额", async function () {
      const amount = ethers.parseEther("1000");
      const unlockDate = (await time.latest()) + 86400;

      await token.connect(user1).approve(await btyLock.getAddress(), amount);
      await btyLock
        .connect(user1)
        .lock(
          user1.address,
          await token.getAddress(),
          false,
          amount,
          unlockDate,
          "测试锁仓"
        );

      const additionalAmount = ethers.parseEther("500");
      await token.connect(user1).approve(await btyLock.getAddress(), additionalAmount);

      await btyLock
        .connect(user1)
        .editLock(1000000, amount + additionalAmount, 0);

      const lock = await btyLock.getLockById(1000000);
      expect(lock.amount).to.equal(amount + additionalAmount);
    });

    it("应该可以延长解锁时间", async function () {
      const amount = ethers.parseEther("1000");
      const unlockDate = (await time.latest()) + 86400;
      const newUnlockDate = (await time.latest()) + 172800; // 2天后

      await token.connect(user1).approve(await btyLock.getAddress(), amount);
      await btyLock
        .connect(user1)
        .lock(
          user1.address,
          await token.getAddress(),
          false,
          amount,
          unlockDate,
          "测试锁仓"
        );

      await btyLock
        .connect(user1)
        .editLock(1000000, 0, newUnlockDate);

      const lock = await btyLock.getLockById(1000000);
      expect(lock.tgeDate).to.equal(newUnlockDate);
    });
  });

  describe("编辑描述 (editLockDescription)", function () {
    it("应该可以编辑锁仓描述", async function () {
      const amount = ethers.parseEther("1000");
      const unlockDate = (await time.latest()) + 86400;

      await token.connect(user1).approve(await btyLock.getAddress(), amount);
      await btyLock
        .connect(user1)
        .lock(
          user1.address,
          await token.getAddress(),
          false,
          amount,
          unlockDate,
          "原始描述"
        );

      await btyLock
        .connect(user1)
        .editLockDescription(1000000, "新描述");

      const lock = await btyLock.getLockById(1000000);
      expect(lock.description).to.equal("新描述");
    });
  });

  describe("转移所有权 (transferLockOwnership)", function () {
    it("应该可以转移锁仓所有权", async function () {
      const amount = ethers.parseEther("1000");
      const unlockDate = (await time.latest()) + 86400;

      await token.connect(user1).approve(await btyLock.getAddress(), amount);
      await btyLock
        .connect(user1)
        .lock(
          user1.address,
          await token.getAddress(),
          false,
          amount,
          unlockDate,
          "测试锁仓"
        );

      await btyLock
        .connect(user1)
        .transferLockOwnership(1000000, user2.address);

      const lock = await btyLock.getLockById(1000000);
      expect(lock.owner).to.equal(user2.address);
    });
  });

  describe("查询功能", function () {
    it("应该可以查询用户的锁仓列表", async function () {
      const amount = ethers.parseEther("1000");
      const unlockDate = (await time.latest()) + 86400;

      await token.connect(user1).approve(await btyLock.getAddress(), amount);
      await btyLock
        .connect(user1)
        .lock(
          user1.address,
          await token.getAddress(),
          false,
          amount,
          unlockDate,
          "测试锁仓"
        );

      const locks = await btyLock.normalLocksForUser(user1.address);
      expect(locks.length).to.equal(1);
      expect(locks[0].owner).to.equal(user1.address);
    });

    it("应该可以查询代币的累计锁仓信息", async function () {
      const amount = ethers.parseEther("1000");
      const unlockDate = (await time.latest()) + 86400;

      await token.connect(user1).approve(await btyLock.getAddress(), amount);
      await btyLock
        .connect(user1)
        .lock(
          user1.address,
          await token.getAddress(),
          false,
          amount,
          unlockDate,
          "测试锁仓"
        );

      const lockInfo = await btyLock.cumulativeLockInfo(await token.getAddress());
      expect(lockInfo.amount).to.equal(amount);
      expect(lockInfo.token).to.equal(await token.getAddress());
    });
  });
});
