const { ethers, network, run } =  require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Depolying Contract with the account:', deployer.address);
    console.log('Account Balance:', (await deployer.provider.getBalance(deployer.address)).toString());
    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    const tokenFactory = await TokenFactory.deploy();
    // console.log("tokenFactory:", tokenFactory);
    // const WAIT_BLOCK_CONFIRMATIONS = 6;
    // await tokenFactory.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);  
    console.log(`Contract deployed to ${tokenFactory.target} on ${network.name}`);
  
    console.log(`Verifying contract on Etherscan...`);
  
    await run(`verify:verify`, {
      address: tokenFactory.target,
      constructorArguments: [],
    });
  }
  
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});