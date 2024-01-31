// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MasterChef is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// @notice Info of each user.
    /// `amount` LP token amount the user has provided.
    /// `rewardDebt` The amount of SAVM entitled to the user.
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    /// @notice Info of each pool.
    /// `allocPoint` The amount of allocation points assigned to the pool.
    /// Also known as the amount of SAVM to distribute per block.
    struct PoolInfo {
        IERC20 lpToken;
        uint256 allocPoint;
        uint256 lastRewardTime;
        uint256 accSavmPerShare;
    }

    /// @notice Address of SAVM contract.
    IERC20 public immutable SAVM;

    /// @notice Info of each pool.
    PoolInfo[] public poolInfo;
    /// @notice Address of the LP token for each pool

    /// @notice Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;
    /// @dev Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint;

    uint256 public savmPerSecond;
    uint256 private constant ACC_SAVM_PRECISION = 1e12;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event LogPoolAddition(uint256 indexed pid, uint256 allocPoint, IERC20 indexed lpToken);
    event LogSetPool(uint256 indexed pid, uint256 allocPoint);
    event LogUpdatePool(uint256 indexed pid, uint256 lastRewardTime, uint256 lpSupply, uint256 accSavmPerShare);
    event LogSavmPerSecond(uint256 savmPerSecond);

    /// @param _savm The SAVM token contract address.
    constructor(IERC20 _savm) {
        SAVM = _savm;
    }

    /// @notice Returns the number of pools.
    function poolLength() public view returns (uint256) {
        return poolInfo.length;
    }

    /// @notice Add a new LP to the pool. Can only be called by the owner.
    /// DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    /// @param allocPoint AP of the new pool.
    /// @param _lpToken Address of the LP ERC-20 token.
    function add(uint256 allocPoint, IERC20 _lpToken) public onlyOwner {
        totalAllocPoint = totalAllocPoint.add(allocPoint);

        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: allocPoint,
            lastRewardTime: block.timestamp,
            accSavmPerShare: 0
        }));
        emit LogPoolAddition(poolInfo.length.sub(1), allocPoint, _lpToken);
    }

    /// @notice Update the given pool's SAVM allocation point. Can only be called by the owner.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _allocPoint New AP of the pool.
    function set(uint256 _pid, uint256 _allocPoint) public onlyOwner {
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
        emit LogSetPool(_pid, _allocPoint);
    }

    /// @notice Sets the savm per second to be distributed. Can only be called by the owner.
    /// @param _savmPerSecond The amount of Savm to be distributed per second.
    function setSavmPerSecond(uint256 _savmPerSecond) public onlyOwner {
        savmPerSecond = _savmPerSecond;
        emit LogSavmPerSecond(_savmPerSecond);
    }

    /// @notice View function to see pending SAVM on frontend.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _user Address of user.
    /// @return pending SAVM reward for a given user.
    function pendingSavm(uint256 _pid, address _user) external view returns (uint256 pending) {
        PoolInfo memory pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accSavmPerShare = pool.accSavmPerShare;
        uint256 lpSupply = poolInfo[_pid].lpToken.balanceOf(address(this));
        if (block.timestamp > pool.lastRewardTime && lpSupply != 0) {
            uint256 time = block.timestamp.sub(pool.lastRewardTime);
            uint256 savmReward = time.mul(accSavmPerShare).mul(pool.allocPoint).div(totalAllocPoint);
            accSavmPerShare = accSavmPerShare.add(savmReward.mul(ACC_SAVM_PRECISION).div(lpSupply));
        }
        pending = user.amount.mul(accSavmPerShare).div(ACC_SAVM_PRECISION).sub(user.rewardDebt);
    }

    /// @notice Update reward variables of the given pool.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @return pool Returns the pool that was updated.
    function updatePool(uint256 pid) public returns (PoolInfo memory pool) {
        pool = poolInfo[pid];
        if (block.timestamp > pool.lastRewardTime) {
            uint256 lpSupply = pool.lpToken.balanceOf(address(this));
            if (lpSupply > 0) {
                uint256 time = block.timestamp.sub(pool.lastRewardTime);
                uint256 savmReward = time.mul(savmPerSecond).mul(pool.allocPoint).div(totalAllocPoint);
                pool.accSavmPerShare = pool.accSavmPerShare.add(savmReward.mul(ACC_SAVM_PRECISION).div(lpSupply));
            }
            pool.lastRewardTime = block.timestamp;
            poolInfo[pid] = pool;
            emit LogUpdatePool(pid, pool.lastRewardTime, lpSupply, pool.accSavmPerShare);
        }
    }

    /// @notice Deposit LP tokens to for SVAM allocation.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to deposit.
    /// @param to The receiver of `amount` deposit benefit.
    function deposit(uint256 pid, uint256 amount, address to) public {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][to];

        pool.lpToken.safeTransferFrom(msg.sender, address(this), amount);
        // Effects
        user.amount = user.amount.add(amount);
        user.rewardDebt = user.rewardDebt.add(amount.mul(pool.accSavmPerShare).div(ACC_SAVM_PRECISION));

        emit Deposit(msg.sender, pid, amount, to);
    }

    /// @notice Withdraw LP tokens from masterChef.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to withdraw.
    /// @param to Receiver of the LP tokens.
    function withdraw(uint256 pid, uint256 amount, address to) public {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][msg.sender];

        // Effects
        user.rewardDebt = user.rewardDebt.sub(amount.mul(pool.accSavmPerShare).div(ACC_SAVM_PRECISION));
        user.amount = user.amount.sub(amount);
        
        pool.lpToken.safeTransfer(to, amount);

        emit Withdraw(msg.sender, pid, amount, to);
    }

    /// @notice Harvest proceeds for transaction sender to `to`.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param to Receiver of SAVM rewards.
    function harvest(uint256 pid, address to) public {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][msg.sender];
        uint256 accumulatedSavm = user.amount.mul(pool.accSavmPerShare).div(ACC_SAVM_PRECISION);
        uint256 _pendingSavm = accumulatedSavm.sub(user.rewardDebt);

        // Effects
        user.rewardDebt = accumulatedSavm;

        // Interactions
        if (_pendingSavm != 0) {
            SAVM.safeTransfer(to, _pendingSavm);
        }

        emit Harvest(msg.sender, pid, _pendingSavm);
    }
    
    /// @notice Withdraw LP tokens from MC and harvest proceeds for transaction sender to `to`.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to withdraw.
    function withdrawAndHarvest(uint256 pid, uint256 amount, address to) public {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][msg.sender];
        uint256 accumulatedSavm = user.amount.mul(pool.accSavmPerShare).div(ACC_SAVM_PRECISION);
        uint256 _pendingSavm = accumulatedSavm.sub(user.rewardDebt);

        // Effects
        user.rewardDebt = accumulatedSavm.sub(amount.mul(pool.accSavmPerShare).div(ACC_SAVM_PRECISION));
        user.amount = user.amount.sub(amount);
        
        // Interactions
        SAVM.safeTransfer(to, _pendingSavm);

        pool.lpToken.safeTransfer(to, amount);

        emit Withdraw(msg.sender, pid, amount, to);
        emit Harvest(msg.sender, pid, _pendingSavm);
    }

    /// @notice Withdraw without caring about rewards. EMERGENCY ONLY.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param to Receiver of the LP tokens.
    function emergencyWithdraw(uint256 pid, address to) public {
        UserInfo storage user = userInfo[pid][msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;

        // Note: transfer can fail or succeed if `amount` is zero.
        poolInfo[pid].lpToken.safeTransfer(to, amount);
        emit EmergencyWithdraw(msg.sender, pid, amount, to);
    }
}