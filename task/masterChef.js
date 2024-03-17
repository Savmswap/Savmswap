const {ethers} = require('ethers');
const axios = require('axios');
const BigNumber = require('bn.js')
const masterChefABI = require('../artifacts/contracts/stake/MasterChef.sol/MasterChef.json').abi;
const tokenABI = require('../artifacts/contracts/test/Token.sol/Token.json').abi;
const factoryABI = require('../artifacts/contracts/TokenFactory.sol/TokenFactory.json').abi;
const stakingABI = require('../artifacts/contracts/stake/Staking.sol/Staking.json').abi;
require('dotenv').config();
const privateKey = process.env.PRIVATE_KEY;
// const provider = new ethers.JsonRpcProvider(`http://10.9.1.248:7545`);
const provider = new ethers.JsonRpcProvider(`https://test-rpc-node-http.svmscan.io`);
	
// const provider = new ethers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/46NNgX7atDiiMUtLKsHuyJwHsk9exn3J`);
const wallet = new ethers.Wallet(privateKey, provider);

const vault = '0x35DabceDDC7b242d374c54DB3979D2910aD807F5'//'0x3d7aDb9C1FC8043bF784C774CF61B3Ae955DB27f';

const valutContract = new ethers.Contract(vault, masterChefABI, wallet);

const test = async() => {
    const abi = require('../abi/test.json');
    const test = new ethers.Contract('0x8439e32d5d0724EA09D3A867D532f29bFA9f617f', abi, wallet);
    const receipt = await test.request();
    await receipt.wait();
    console.log('hash:', receipt.hash);
}

function wait(ms) {
    return new Promise(resolve =>setTimeout(() =>resolve(), ms));
}

const balance = async(token, user) => {
    const tokenContract = new ethers.Contract(token, tokenABI, wallet);
    const bal = await tokenContract.balanceOf(user);
    console.log(`name: ${await tokenContract.name()} symbol: ${await tokenContract.symbol()} decimals: ${await tokenContract.decimals()}`);
    console.log(`balance: ${bal}`);
    return bal;
}

const approve = async(token, user) => {
    const tokenContract = new ethers.Contract(token, tokenABI, wallet);
    const tx = await tokenContract.approve(user, '10000000000000000000000000000');
    await tx.wait();
    console.log(`approve hash: ${tx.hash}`);
}


const createToken = async(name, symbol, decimals, amount) => {
    const tokenContract = new ethers.Contract('0x80aC4C1ABD0ff72ea902F552a2dA40C7f504CF12', factoryABI, wallet);
    const tx = await tokenContract.createToken(name, symbol, decimals, amount);
    await tx.wait();
    console.log(`tx: ${tx.hash}`);
}
const pendingReward = async(pid, user) => {
    const pool = await valutContract.poolInfo(pid);
    const userInfo = await valutContract.userInfo(pid, user);
    const userAmount = userInfo[0];
    const userRewardDebt = userInfo[1];
    console.log(`userAmount: ${userAmount} userRewardDebt: ${userRewardDebt}`);
    var accRewardPerShare = pool[3];
    console.log(`accRewardPerShare: ${accRewardPerShare}`);
    const lpToken = pool[0];
    const lpSupply = await balance(lpToken, vault);
    const block = await provider.getBlock();
    const blockTimestamp = block.timestamp;
    const lastRewardTimestamp = pool[2];
    const allocPoint = pool[1];
    const totalAllocPoint = await valutContract.totalAllocPoint();
    console.log(`totalAllocPoint: ${totalAllocPoint} allocPoint: ${allocPoint}`);
    console.log(`blockTimestamp: ${blockTimestamp} lastRewardTimestamp: ${lastRewardTimestamp}`);
    if (ethers.toBigInt(blockTimestamp) > ethers.toBigInt(lastRewardTimestamp) && ethers.toBigInt(lpSupply) > 0) {
        const time = ethers.toBigInt(blockTimestamp) - ethers.toBigInt(lastRewardTimestamp);
        const rewardReward = time * ethers.toBigInt(accRewardPerShare) * ethers.toBigInt(allocPoint) / ethers.toBigInt(totalAllocPoint);
        console.log(`rewardReward: ${rewardReward}`);
        accRewardPerShare = ethers.toBigInt(accRewardPerShare) + (rewardReward * ethers.toBigInt("1000000000000") / ethers.toBigInt(lpSupply));
    }
    console.log(`accRewardPerShare: ${accRewardPerShare}`);
    const pending = ethers.toBigInt(userAmount) * accRewardPerShare / ethers.toBigInt("1000000000000") - ethers.toBigInt(userRewardDebt);
    console.log(`pending: ${pending}`);
}

const staking = async(lpToken, _minimumStakingDuration, _penaltyRate, _whitelistUser, _receivePenaltyDev) => {
    const stakingContract = new ethers.Contract("0x8577f97cF0f837908B1D8049D02F2c9C7032aF39", stakingABI, wallet);
    var tx = '';
    console.log(`transferOwnership owner: ${await stakingContract.owner()}`);
    tx = await stakingContract.transferOwnership('0x0f5895547343fd9ED43d869505B8dE995fb65eD4');
    await tx.wait();
    console.log(`transferOwnership tx: ${tx.hash}`);
    // tx = await stakingContract.setRewardPerSecond('1000');
    // await tx.wait();
    // console.log(`setRewardPerSecond tx: ${tx.hash}`);
    // tx = await stakingContract.add(10000, lpToken, _minimumStakingDuration, _penaltyRate, _whitelistUser, _receivePenaltyDev);
    // await tx.wait();
    // console.log(`add tx: ${tx.hash}`);
    const count = await stakingContract.poolLength();
    for(var i=0;i<count;i++) {
        const poolInfo = await stakingContract.poolInfo(i);
        console.log("poolInfo:", poolInfo);
    }
    // await approve(lpToken, '0x8577f97cF0f837908B1D8049D02F2c9C7032aF39');
    const bal = '500786153587536'//await balance(lpToken, wallet.address);
    // tx = await stakingContract.deposit(0, bal, wallet.address);
    // await tx.wait();
    // console.log(`deposit tx: ${tx.hash}`);
    const blockNo = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNo);
    console.log(`blockTimestamp: ${block.timestamp}`);
    // const reward = await stakingContract.pendingReward(0, wallet.address);
    // console.log(`reward: ${reward}`);
    // tx = await stakingContract.updatePool(0);
    // await tx.wait();
    // console.log(`updatePool hash: ${tx.hash}`);
    console.log(`UserInfo: ${await stakingContract.userInfo(0, wallet.address)}`);
    // tx = await stakingContract.withdraw(0, "495778292051661", wallet.address);
    // await tx.wait();
    // console.log(`withdraw hash: ${tx.hash}`);
    // tx = await stakingContract.harvest(0, wallet.address);
    // await tx.wait();
    // console.log(`harvest hash: ${tx.hash}`);
}

const Trans = async() => {

    // const receipt = await valutContract.setRewardPerSecond(15996580424);
    // await receipt.wait();
    // console.log(`receipt: ${receipt.hash}`);
    // for(var i=0;i<100;i++) {
    //     const count = await valutContract.poolLength();
    //     console.log(`count: ${count}`);
    //     await wait(1000);
    // }
    const user = '0xEfd1c654008Ac15AC15d3F617143613583e6AceC'
    // // const userInfo = await valutContract.userInfo('0', user);
    // // console.log(`userInfo: ${userInfo}`);
    // const rewardPerSecond = await valutContract.rewardPerSecond();
    // console.log(`rewardPerSecond: ${rewardPerSecond}`);
    // const reward = await valutContract.pendingReward('0', user);
    // console.log(`reward: ${reward}`);
    // await pendingReward(0, user);
    // const poolInfo = await valutContract.poolInfo('0');
    // console.log(`poolInfo: ${poolInfo}`);
    // await balance('0xD975aa7530009b2c5bf7647Ca3A80C5b6e5D03DF', '0x448a4460e289992a1e18e8FEed9E942667184D9f');
    // const totalAllocPoint = await valutContract.totalAllocPoint();
    // console.log(`totalAllocPoint: ${totalAllocPoint}`);
    // await test();
    // await createToken('test', 'test', 18, ethers.parseEther("1000"));
    // const res = await provider.getTransactionReceipt('0x5450a5817bab032748c9289bf44b10a7ff6db1af2a339f6b9f72e8d2827a5c76');
    // console.log("res:", res);
    await staking('0x4EA9983FA42637e44870e16971CC4A76c6D6BC6b', 0, 0, wallet.address, wallet.address);
}

Trans().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});
