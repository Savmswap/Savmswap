// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./WbtcMaker.sol";

/// @notice Contract for selling weth to sushi. Deploy on mainnet.
contract SushiMaker is WbtcMaker {

    event Serve(uint256 amount);

    address public immutable savm;

    constructor(
        address owner,
        address user,
        address factory,
        address wbtc,
        address _savm
    ) WbtcMaker(owner, user, factory, wbtc) {
        savm = _savm;
    }

    function buySavm(uint256 amountIn, uint256 minOutAmount, address to) external onlyTrusted returns (uint256 amountOut) {
        amountOut = _swap(wbtc, savm, amountIn, to);
        if (amountOut < minOutAmount) revert SlippageProtection();
        emit Serve(amountOut);
    }

    // In case we receive any unwrapped ethereum we can call this.
    function wrapBtc() external {
        wbtc.call{value: address(this).balance}("");
    }

}