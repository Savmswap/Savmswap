// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const {ethers} = hre;

async function deployFactory(feeToSetter) {
  // const CindexSwap = await ethers.getContractFactory("CindexSwap");
  // const cindexSwap = await CindexSwap.deploy();
  // console.log("CindexSwap deployed to:", cindexSwap.target);
  const SavmswapV2Factory = await ethers.getContractFactory("SavmswapV2Factory");
  const factory = await SavmswapV2Factory.deploy(feeToSetter);
  console.log("SavmswapV2Factory deployed to:", factory.target);
  return factory.target;
} 

async function deployMulticall() {
  // const CindexSwap = await ethers.getContractFactory("CindexSwap");
  // const cindexSwap = await CindexSwap.deploy();
  // console.log("CindexSwap deployed to:", cindexSwap.target);
  const Multicall = await ethers.getContractFactory("Multicall3");
  const multicall = await Multicall.deploy();
  console.log("Multicall deployed to:", multicall.target);
  return multicall.target;
} 

async function deployWBTC() {
  // const CindexSwap = await ethers.getContractFactory("CindexSwap");
  // const cindexSwap = await CindexSwap.deploy();
  // console.log("CindexSwap deployed to:", cindexSwap.target);
  const WBTC = await ethers.getContractFactory("WBTC");
  const wBTC = await WBTC.deploy();
  console.log("wBTC deployed to:", wBTC.target);
  return wBTC.target;
} 

async function deployRouter(factory, wBTC) {
  const SavmswapV2Router02 = await ethers.getContractFactory("SavmswapV2Router02");
  const savmswapV2Router02 = await SavmswapV2Router02.deploy(factory, wBTC);
  console.log("savmswapV2Router02 deployed to:", savmswapV2Router02.target);
  return savmswapV2Router02.target;
}

async function deployToken() {
  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy('USDC', 'USDC', 6);
  console.log("USDC deployed to:", token.target);
  const token1 = await Token.deploy('USDT', 'USDT', 6);
  console.log("USDT deployed to:", token1.target);
  const token2 = await Token.deploy('DAI', 'DAI', 18);
  console.log("DAI deployed to:", token2.target);
}

async function deployMasterChef(rewardToken, accRewardPerShare, lpToken, allocPoint) {
  const MasterChef = await ethers.getContractFactory("MasterChef");
  const masterChef = await MasterChef.deploy(rewardToken);
  console.log("MasterChef deployed to:", masterChef.target);
  const receipt = await masterChef.setRewardPerSecond(accRewardPerShare);
  await receipt.wait();
  console.log('hash:', receipt.hash);
  const receipt1 = await masterChef.add(allocPoint, lpToken);
  await receipt1.wait();
  console.log('hash1:', receipt1.hash);
}

async function deployTokenFactory(name, symbol, decimals) {
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const tokenFactory = await TokenFactory.deploy();
  console.log("TokenFactory deployed to:", tokenFactory.target);
  return tokenFactory;
}

async function deployStaking(rewardToken) {
  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(rewardToken);
  console.log("Staking deployed to:", staking.target);
  return staking;
}
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Depolying Contract with the account:', deployer.address);
  console.log('Account Balance:', (await deployer.provider.getBalance(deployer.address)).toString());
  const factory = '0x1842c9bD09bCba88b58776c7995A9A9bD220A925';//await deployFactory('0x2a99572303b616B04424AAf3a63277160718B779');
  // await deployMulticall();
  const wbtc = '0x3607703ccF378999D5953387B56453c3cd22896F'//'0x5db252ead05C54B08A83414adCAbF46Eaa9E0337'//await deployWBTC();
  const savm = '0x77726BFbE61B6ad7463466fD521A3A4B89B0EFd8';
  //'0x32B8879aD49914bff5221BB6F614d15466e8e690', '0x2386b02877dc79B4e6C243EE98f57ff28d256186'
  // await deployRouter(factory, wbtc);
  // await deployToken();
  // await deployMasterChef(savm, '100000000', '0x4EA9983FA42637e44870e16971CC4A76c6D6BC6b', 10000);
  // await deployMasterChef(wbtc, '10000000000', savm, 10000);
  // await deployTokenFactory();
  // const token = await factory.createToken('TEST', 'test', 18, ethers.parseEther("1000"));
  // await token.wait();
  // const res = await deployer.provider.getTransactionReceipt(token.hash);
  // console.log("返回值:", res);
  await deployStaking(savm);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
