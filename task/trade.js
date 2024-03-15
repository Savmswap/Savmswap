const xlsx = require('node-xlsx');
const {ethers} = require('ethers');
const schedule = require('node-schedule');
const chalk = require('chalk')
const { log } = require("console");
require('dotenv').config();
// const provider = new ethers.JsonRpcProvider(`http://10.9.1.248:7545`);
// const url = 'https://eth.llamarpc.com';
const url = 'https://test-rpc-node-http.svmscan.io';
const provider = new ethers.JsonRpcProvider(url);
const routerABI = require('../artifacts/contracts/SavmswapV2Router02.sol/SavmswapV2Router02.json').abi;
const tokenABI = require('../artifacts/contracts/test/Token.sol/Token.json').abi;
const pairABI = require('../artifacts/contracts/SavmswapV2Pair.sol/SavmswapV2Pair.json').abi;	
const stakeABI = require('../artifacts/contracts/stake/MasterChef.sol/MasterChef.json').abi
const private = process.env.PRIVATE_KEY;
const routerAddress = '0x306bC85Cf39c49C442e1E00BF7eF553B9e94f79A';
const savmAddress = '0x77726BFbE61B6ad7463466fD521A3A4B89B0EFd8';
const stakeSavmAddress = '0x3d7aDb9C1FC8043bF784C774CF61B3Ae955DB27f';
const stakeLpAddress = '0x35DabceDDC7b242d374c54DB3979D2910aD807F5';
const pairAddress = '0x4EA9983FA42637e44870e16971CC4A76c6D6BC6b';
const btcAddress = '0x3607703ccF378999D5953387B56453c3cd22896F';

const excelFilePath = '/Users/casey/Downloads/Guild of dogs season 2 wallet.xlsx';

const sheets = xlsx.parse(excelFilePath);

const sheet = sheets[0];

const data = sheet.data;
const count = data.length;
console.log("总数:", count);

const approve = async(token, privateKey, to, retries=0) => {
    const wallet = new ethers.Wallet(privateKey, provider);
    const savmContract = new ethers.Contract(token, tokenABI, wallet);
    const approveAmount = await savmContract.allowance(wallet.address, to);
    if (approveAmount <= 0) {
        try {
            const receipt = await savmContract.approve(to, '340282366920938463463374607431768211455', {gasPrice: 0x989680});
            await receipt.wait();
            console.log(`user: ${wallet.address} approve savm hash: ${receipt.hash}`);
        }catch(error) {
            if (retries > 3) {
                console.log("approve error:", error);
                return;
            }
            console.log('approve retry...', retries + 1);
            await wait(1000);
            await approve(token, privateKey, to, retries + 1)
        }
    }
}

//计算可以添加流动性的savm数量
const calculateSavm = async(user) => {
    var btcAmount = await btcBal(user);
    const savmAmount = await savmBal(user);//ethers.toBigInt("100000000000");//await savmBal(user);
    if (btcAmount <= 0 || savmAmount <= 0) {
        return [0,0];
    }
    // const pairContract = new ethers.Contract(pairAddress, pairABI, provider);
    // const amounts = await pairContract.getReserves();
    const routerContract = new ethers.Contract(routerAddress, routerABI, provider);
    var amount = await routerContract.getAmountsOut(savmAmount, [savmAddress, btcAddress]);
    btcAmount = ethers.toBigInt(btcAmount) * ethers.toBigInt(8) / ethers.toBigInt(10);
    if (ethers.toBigInt(amount[1]) >= btcAmount) {
        amount = (await routerContract.getAmountsIn(btcAmount, [btcAddress,savmAddress]));
    }
    return amount;
}

const addLiquidity = async(privateKey,retries=0) => {
    const wallet = new ethers.Wallet(privateKey, provider);
    const routerContract = new ethers.Contract(routerAddress, routerABI, wallet);
    const user = wallet.address;
    //查询savm数量
    const amount = await calculateSavm(user);
    const amount0 = ethers.toBigInt(amount[0]);
    const amount1 = ethers.toBigInt(amount[1]);
    if (amount0 > 0 && amount1 > 0) {
        try {
            await approve(savmAddress, privateKey, routerAddress);
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const receipt = await routerContract.addLiquidityBTC(savmAddress, amount0, 0, 0, user, deadline, {value: amount1, gasPrice: 0x989680});
            await receipt.wait();
            console.log(`user: ${user} addLiquidity hash: ${receipt.hash}`);
        } catch(error) {
            if (retries > 3) {
                console.log("addLiquidity error:", error);
                return;
            }
            console.log('addLiquidity retry...', retries + 1);
            await wait(1000);
            await addLiquidity(privateKey, retries + 1);
        }
    }
    
}

const removeLiquidity = async(privateKey,retries=0) => {
    const wallet = new ethers.Wallet(privateKey, provider);
    const routerContract = new ethers.Contract(routerAddress, routerABI, wallet);
    const user = wallet.address;
    //查询lp数量
    const lpAmount = await pairBal(user);
    if (lpAmount > 0){
        try {
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            await approve(pairAddress, privateKey, routerAddress);
            const receipt = await routerContract.removeLiquidityBTC(savmAddress, lpAmount, 0, 0, user, deadline,{gasPrice: 0x989680});
            await receipt.wait();
            console.log(`user: ${user} removeLiquidity hash: ${receipt.hash}`);
        }catch(error){
            if (retries > 3) {
                console.log("removeLiquidity error:", error);
                return;
            }
            console.log('removeLiquidity retry...', retries + 1);
            await wait(1000);
            await removeLiquidity(privateKey, retries + 1);
        }
    }
}

const stakeSavm = async(privateKey, retries=0) => {
    try { 
        const wallet = new ethers.Wallet(privateKey, provider);
        const stakeContract = new ethers.Contract(stakeSavmAddress, stakeABI, wallet);
        const user = wallet.address;
        const savmAmount = await savmBal(user);
        if (ethers.toBigInt(savmAmount) > 0) {
            await approve(savmAddress, privateKey, stakeSavmAddress);
            const receipt = await stakeContract.deposit(0, savmAmount, user, {gasPrice: 0x989680});
            await receipt.wait();
            console.log(`user: ${user} Stake Savm hash: ${receipt.hash}`);
        }
    } catch(error) {
        
        if (retries > 3) {
            console.log("stakeSavm error:", error);
            return;
        }
        console.log('stakeSavm retry...', retries + 1);
        await wait(1000);
        await stakeSavm(privateKey, retries + 1);
    }    
}

const unstakeSavm = async(privateKey,retries=0) => {
    try { 
        const wallet = new ethers.Wallet(privateKey, provider);
        const stakeContract = new ethers.Contract(stakeSavmAddress, stakeABI, wallet);
        const user = wallet.address;
        const savmAmount = (await stakeContract.userInfo(0, user))[0];
        if (ethers.toBigInt(savmAmount) > 0) {
            const receipt = await stakeContract.withdrawAndHarvest(0, savmAmount, user, {gasPrice: 0x989680});
            await receipt.wait();
            console.log(`user: ${user} unStake Savm hash: ${receipt.hash}`);
        }
    } catch(error) {
        if (retries > 3) {
            console.log("unstakeSavm error:", error);
            return;
        }
        console.log('unstakeSavm retry...', retries + 1);
        await wait(1000);
        await unstakeSavm(privateKey, retries + 1);
    }     
}

const stakeLp = async(privateKey,retries=0) => {
    try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const stakeContract = new ethers.Contract(stakeLpAddress, stakeABI, wallet);
        const user = wallet.address;
        const pairAmount = await pairBal(user);
        if(ethers.toBigInt(pairAmount) > 0){
            await approve(pairAddress, privateKey, stakeLpAddress);
            const receipt = await stakeContract.deposit(0, pairAmount, user, {gasPrice: 0x989680});
            await receipt.wait();
            console.log(`user: ${user} Stake LP hash: ${receipt.hash}`);
        }
    } catch(error) {
        
        if (retries > 3) {
            console.log("stakeLp error:", error);
            return;
        }
        console.log('Stake LP retry...', retries + 1);
        await wait(1000);
        await stakeLp(privateKey, retries + 1);
    }
    
}

const unstakeLp = async(privateKey, retries=0) => {
    try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const stakeContract = new ethers.Contract(stakeLpAddress, stakeABI, wallet);
        const user = wallet.address;
        const lpAmount = (await stakeContract.userInfo(0, user))[0];
        if (ethers.toBigInt(lpAmount) > 0) {
            const receipt = await stakeContract.withdrawAndHarvest(0, lpAmount, user, {gasPrice: 0x989680});
            await receipt.wait();
            console.log(`user: ${user} unStake LP hash: ${receipt.hash}`);
        }
    } catch(error) {
        if (retries > 3) {
            console.log("unstakeLp error:", error);
            return;
        }
        console.log('unstakeLp retry...', retries + 1);
        await wait(1000);
        await unstakeLp(privateKey, retries + 1);
    }
}

const pairBal = async(user) => {
    const pairContract = new ethers.Contract(pairAddress, pairABI, provider);
    const bal = await pairContract.balanceOf(user);
    console.log(`user:${user} lp: ${bal}`);
    return bal;
}

const btcBal = async(user) => {
    const bal = await provider.getBalance(user);
    console.log(`user:${user} btc: ${bal}`);
    return bal;
}

const savmBal = async(user) => {
    const savmContract = new ethers.Contract(savmAddress, tokenABI, provider);
    const bal = await savmContract.balanceOf(user);
    console.log(`user:${user} savm: ${bal}`);
    return bal;
}

const transfer = async(token, user, amount) => {
    const wallet = new ethers.Wallet(private, provider);
    const tokenContract = new ethers.Contract(token, tokenABI, wallet);
    const receipt = await tokenContract.transfer(user, amount, {gasPrice: 0x989680});
    await receipt.wait();
    console.log(`from: ${wallet.address} transfer to: ${user} hash: ${receipt.hash}`);
}

const btcTransfer = async(user, amount) => {
    const wallet = new ethers.Wallet(private, provider);
    const receipt = await wallet.sendTransaction({
        from: wallet.address,
        to: user,
        value: amount,
        gasPrice: 0x989680
    });
    await receipt.wait();
    console.log(`from: ${wallet.address} transfer BTC to: ${user} hash: ${receipt.hash}`);
}
var privateKeys = [private]
for(var i=1;i<count;i++) {
    const privateKey = data[i][2];
    privateKeys.push(privateKey);
}

const fnList = privateKeys.map((privateKey) => () => someTask(privateKey));
//定义规则
let rule = new schedule.RecurrenceRule();
rule.minute = 59;
rule.second = 0;

let job = schedule.scheduleJob(rule, async() => {
    await concurrentRun(fnList, 5, "模拟交易");
});

const someTask = async(privateKey) => {
    //解压savm
    await unstakeSavm(privateKey);
    await wait(5000);
    //添加流动性
    await addLiquidity(privateKey);
    await wait(5000);
    //质押lp
    await stakeLp(privateKey);
    await wait(5000);
    //解压Lp
    await unstakeLp(privateKey);
    await wait(5000);
    //移除流动性
    await removeLiquidity(privateKey);
    await wait(5000);
    //质押savm
    await stakeSavm(privateKey);
    await wait(5000);
    return 'success';
}

function wait(ms) {
    return new Promise(resolve =>setTimeout(() =>resolve(), ms));
};

/**
 * 执行多个异步任务
 * @param {*} fnList 任务列表
 * @param {*} max 最大并发数限制
 * @param {*} taskName 任务名称
 */
const concurrentRun = async(fnList = [], max = 5, taskName = "未命名") => {
    if (!fnList.length) return;
  
    log(chalk.blue(`开始执行多个异步任务，最大并发数： ${max}`));
    const replyList = []; // 收集任务执行结果
    const count = fnList.length; // 总任务数量
    const startTime = new Date().getTime(); // 记录任务执行开始时间
  
    let current = 0;
    // 任务执行程序
    const schedule = async (index) => {
      return new Promise(async (resolve) => {
        const fn = fnList[index];
        if (!fn) return resolve();
  
        // 执行当前异步任务
        const reply = await fn();
        replyList[index] = reply;
        log(`${taskName} 事务进度 ${((++current / count) * 100).toFixed(2)}% `);
  
        // 执行完当前任务后，继续执行任务池的剩余任务
        await schedule(index + max);
        resolve();
      });
    };
  
    // 任务池执行程序
    const scheduleList = new Array(max)
      .fill(0)
      .map((_, index) => schedule(index));
    // 使用 Promise.all 批量执行
    const r = await Promise.all(scheduleList);
  
    const cost = (new Date().getTime() - startTime) / 1000;
    log(chalk.green(`执行完成，最大并发数： ${max}，耗时：${cost}s`));
    return replyList;
  }
// const Trans = async() => {
//     // await btcTransfer('0x7F6b2f80e27accD049cE9e400a96A145a8B4C14F', ethers.parseUnits('0.00000001'));
//     // for(var i=12;i<count;i++) {
//         // const user = data[i][1];
//         // await transfer(savmAddress, '0x4F6DB10Ec6701A147b957EE62318dA9d71392CFc', ethers.parseUnits('0.01'));
//         // await btcTransfer('0x4F6DB10Ec6701A147b957EE62318dA9d71392CFc', ethers.parseUnits('0.00071'));
//         // console.log(data[i][1]);
//     // }
//     // await calculateSavm('0x448a4460e289992a1e18e8FEed9E942667184D9f');
//     // await removeLiquidity(private);
//     // await addLiquidity(private);
//     // await stakeSavm(private);
//     // await unstakeSavm(private);
//     // await stakeLp(private);
//     // await unstakeLp(private);
    
    
// }

// Trans().then(() => process.exit(0)).catch((error) => {
//     console.error(error);
//     process.exit(1);
// });


