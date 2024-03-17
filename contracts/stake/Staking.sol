// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library SignedSafeMath {
    int256 constant private _INT256_MIN = -2**255;

    /**
     * @dev Returns the multiplication of two signed integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     *
     * - Multiplication cannot overflow.
     */
    function mul(int256 a, int256 b) internal pure returns (int256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        require(!(a == -1 && b == _INT256_MIN), "SignedSafeMath: multiplication overflow");

        int256 c = a * b;
        require(c / a == b, "SignedSafeMath: multiplication overflow");

        return c;
    }

    /**
     * @dev Returns the integer division of two signed integers. Reverts on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(int256 a, int256 b) internal pure returns (int256) {
        require(b != 0, "SignedSafeMath: division by zero");
        require(!(b == -1 && a == _INT256_MIN), "SignedSafeMath: division overflow");

        int256 c = a / b;

        return c;
    }

    /**
     * @dev Returns the subtraction of two signed integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(int256 a, int256 b) internal pure returns (int256) {
        int256 c = a - b;
        require((b >= 0 && c <= a) || (b < 0 && c > a), "SignedSafeMath: subtraction overflow");

        return c;
    }

    /**
     * @dev Returns the addition of two signed integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     *
     * - Addition cannot overflow.
     */
    function add(int256 a, int256 b) internal pure returns (int256) {
        int256 c = a + b;
        require((b >= 0 && c >= a) || (b < 0 && c < a), "SignedSafeMath: addition overflow");

        return c;
    }

    function toUInt256(int256 a) internal pure returns (uint256) {
        require(a >= 0, "Integer < 0");
        return uint256(a);
    }
}

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import './StakingCoin.sol';


contract Staking is Ownable, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using SignedSafeMath for int256;

    /// @notice Info of each user.
    /// `amount` LP token amount the user has provided.
    /// `rewardDebt` The amount of REWARD entitled to the user.
    struct UserInfo {
        uint256 amount;
        int256 rewardDebt;
        uint256 lastStakeTime;
    }

    /// @notice Info of each pool.
    /// `allocPoint` The amount of allocation points assigned to the pool.
    /// Also known as the amount of REWARD to distribute per block.
    struct PoolInfo {
        IERC20 lpToken;
        uint256 allocPoint;
        uint256 lastRewardTime;
        uint256 accRewardPerShare;
        uint256 minimumStakingDuration;
        uint256 penaltyRate;
        address token;
        address penaltyRecipient;
    }

    /// @notice Address of rewardToken contract.
    IERC20 public immutable rewardToken;

    /// @notice Info of each pool.
    PoolInfo[] public poolInfo;
    /// @notice Address of the LP token for each pool

    /// @notice Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;
    /// @dev Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint;

    uint256 public rewardPerSecond;
    uint256 private constant ACC_REWARD_PRECISION = 1e12;
    string prefix = "e";

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount, address to);
    event LogPoolAddition(uint256 indexed pid, uint256 allocPoint, IERC20 indexed lpToken, address token);
    event LogSetPool(uint256 indexed pid, uint256 allocPoint);
    event LogUpdatePool(uint256 indexed pid, uint256 lastRewardTime, uint256 lpSupply, uint256 accRewardPerShare);
    event LogRewardPerSecond(uint256 rewardPerSecond);

    /// @param _rewardToken The REWARD token contract address.
    constructor(IERC20 _rewardToken) {
        rewardToken = _rewardToken;
    }

    /// @notice Returns the number of pools.
    function poolLength() public view returns (uint256) {
        return poolInfo.length;
    }

    function _createToken(
                string memory name, 
                string memory symbol, 
                uint8 decimals, 
                address whitelistUser
            ) internal returns (address token) {
        bytes memory bytecode = type(StakingCoin).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(name, symbol, decimals, block.timestamp, msg.sender));
        assembly {
            token := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        StakingCoin(token).initialize(name, symbol, decimals, whitelistUser);
    }

    /// @notice Add a new LP to the pool. Can only be called by the owner.
    /// DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    /// @param allocPoint AP of the new pool.
    /// @param _lpToken Address of the LP ERC-20 token.
    function add(uint256 allocPoint, IERC20 _lpToken, uint256 _minimumStakingDuration, uint256 _penaltyRate, address _whitelistUser, address _penaltyRecipient) public onlyOwner {
        totalAllocPoint = totalAllocPoint.add(allocPoint);
        ERC20 lpToken = ERC20(address(_lpToken));
        address _token = _createToken(string(abi.encodePacked("Earnest", lpToken.name())), string(abi.encodePacked(prefix, lpToken.symbol())), lpToken.decimals(), _whitelistUser);
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: allocPoint,
            lastRewardTime: block.timestamp,
            accRewardPerShare: 0,
            minimumStakingDuration: _minimumStakingDuration,
            penaltyRate: _penaltyRate,
            token: _token,
            penaltyRecipient: _penaltyRecipient
        }));
        emit LogPoolAddition(poolInfo.length.sub(1), allocPoint, _lpToken, _token);
    }

    /// @notice Update the given pool's REWARD allocation point. Can only be called by the owner.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _allocPoint New AP of the pool.
    function set(uint256 _pid, uint256 _allocPoint) public onlyOwner {
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
        emit LogSetPool(_pid, _allocPoint);
    }
    
    function setMinimumStakingDuration(uint256 _pid, uint256 _minimumStakingDuration) public onlyOwner {
        poolInfo[_pid].minimumStakingDuration = _minimumStakingDuration;
    }

    function setPenaltyRate(uint256 _pid, uint256 _penaltyRate) public onlyOwner {
        poolInfo[_pid].penaltyRate = _penaltyRate;
    }

    function setPenaltyRecipient(uint256 _pid, address _penaltyRecipient) public onlyOwner {
        poolInfo[_pid].penaltyRecipient = _penaltyRecipient;
    }

    /// @notice Sets the reward per second to be distributed. Can only be called by the owner.
    /// @param _rewardPerSecond The amount of Reward to be distributed per second.
    function setRewardPerSecond(uint256 _rewardPerSecond) public onlyOwner {
        rewardPerSecond = _rewardPerSecond;
        emit LogRewardPerSecond(_rewardPerSecond);
    }

    /// @notice View function to see pending REWARD on frontend.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _user Address of user.
    /// @return pending REWARD reward for a given user.
    function pendingReward(uint256 _pid, address _user) external view returns (uint256 pending) {
        PoolInfo memory pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accRewardPerShare = pool.accRewardPerShare;
        uint256 lpSupply = poolInfo[_pid].lpToken.balanceOf(address(this));
        if (block.timestamp > pool.lastRewardTime && lpSupply != 0) {
            uint256 time = block.timestamp.sub(pool.lastRewardTime);
            uint256 rewardReward = time.mul(rewardPerSecond).mul(pool.allocPoint).div(totalAllocPoint);
            accRewardPerShare = accRewardPerShare.add(rewardReward.mul(ACC_REWARD_PRECISION).div(lpSupply));
        }
        pending = int256(user.amount.mul(accRewardPerShare).div(ACC_REWARD_PRECISION)).sub(user.rewardDebt).toUInt256();
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
                uint256 rewardReward = time.mul(rewardPerSecond).mul(pool.allocPoint).div(totalAllocPoint);
                pool.accRewardPerShare = pool.accRewardPerShare.add(rewardReward.mul(ACC_REWARD_PRECISION).div(lpSupply));
            }
            pool.lastRewardTime = block.timestamp;
            poolInfo[pid] = pool;
            emit LogUpdatePool(pid, pool.lastRewardTime, lpSupply, pool.accRewardPerShare);
        }
    }

    /// @notice Deposit LP tokens to for SVAM allocation.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to deposit.
    /// @param to The receiver of `amount` deposit benefit.
    function deposit(uint256 pid, uint256 amount, address to) public whenNotPaused {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][to];

        pool.lpToken.safeTransferFrom(msg.sender, address(this), amount);
        // Effects
        user.amount = user.amount.add(amount);
        user.rewardDebt = user.rewardDebt.add(int256(amount.mul(pool.accRewardPerShare).div(ACC_REWARD_PRECISION)));
        user.lastStakeTime = block.timestamp;

        StakingCoin(pool.token).mint(to, amount);

        emit Deposit(msg.sender, pid, amount, to);
    }

    /// @notice Withdraw LP tokens from masterChef.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to withdraw.
    /// @param to Receiver of the LP tokens.
    function withdraw(uint256 pid, uint256 amount, address to) public {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][msg.sender];
        StakingCoin(pool.token).burn(msg.sender, amount);
        // Effects
        bool isPenalty = block.timestamp.sub(user.lastStakeTime) < pool.minimumStakingDuration;
        uint256 penalty = 0;
        uint256 _pendingReward = 0;
        if (isPenalty) {
            penalty = amount.mul(pool.penaltyRate).mul(pool.minimumStakingDuration.sub(block.timestamp.sub(user.lastStakeTime))).div(10000);
            pool.lpToken.safeTransfer(pool.penaltyRecipient, penalty);
            user.lastStakeTime = block.timestamp;
            user.rewardDebt = 0;
        } else if (user.amount == 0){
            int256 accumulatedReward = int256(user.amount.mul(pool.accRewardPerShare).div(ACC_REWARD_PRECISION));
            _pendingReward = accumulatedReward.sub(user.rewardDebt).toUInt256();
            user.rewardDebt = accumulatedReward;
        } else {
            user.rewardDebt = user.rewardDebt.sub(int256(amount.mul(pool.accRewardPerShare).div(ACC_REWARD_PRECISION)));
        }
        user.amount = user.amount.sub(amount);

        if (_pendingReward != 0) {
            rewardToken.safeTransfer(to, _pendingReward);
        }
        pool.lpToken.safeTransfer(to, amount - penalty);
        emit Withdraw(msg.sender, pid, amount, to);
    }

    /// @notice Harvest proceeds for transaction sender to `to`.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param to Receiver of REWARD rewards.
    function harvest(uint256 pid, address to) public {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][msg.sender];
        bool isPenalty = block.timestamp.sub(user.lastStakeTime) < pool.minimumStakingDuration;
        require(!isPenalty, "Less than the minimum staking time");
        int256 accumulatedReward = int256(user.amount.mul(pool.accRewardPerShare).div(ACC_REWARD_PRECISION));
        uint256 _pendingReward = accumulatedReward.sub(user.rewardDebt).toUInt256();

        // Effects
        user.rewardDebt = accumulatedReward;
        // Interactions
        if (_pendingReward != 0) {
            rewardToken.safeTransfer(to, _pendingReward);
        }

        emit Harvest(msg.sender, pid, _pendingReward, to);
    }

    function withdrawRewardToken(address to, uint256 amount) external onlyOwner {
        rewardToken.safeTransfer(to, amount);
    }

    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() external onlyOwner whenPaused {
        _unpause();
    }
}