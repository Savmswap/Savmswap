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
  const Multicall = await ethers.getContractFactory("Multicall");
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

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Depolying Contract with the account:', deployer.address);
  console.log('Account Balance:', (await deployer.provider.getBalance(deployer.address)).toString());
  const factory = await deployFactory(deployer.address);
  // await deployMulticall();
  const wbtc = '0x3607703ccF378999D5953387B56453c3cd22896F'//await deployWBTC();
  //'0x32B8879aD49914bff5221BB6F614d15466e8e690', '0x2386b02877dc79B4e6C243EE98f57ff28d256186'
  await deployRouter(factory, wbtc);
  // await deployToken();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
