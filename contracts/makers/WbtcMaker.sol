// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Unwindooor.sol";

/// @notice Contract for selling received tokens into weth. Deploy on secondary networks.
contract WbtcMaker is Unwindooor {

    event SetBridge(address indexed token, address bridge);

    address public immutable wbtc;

    mapping(address => address) public bridges;

    constructor(
        address owner,
        address user,
        address factory,
        address _wbtc
    ) Unwindooor(owner, user, factory) {
        wbtc = _wbtc;
    }

    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address to
    ) internal returns (uint256 outAmount) {

        ISavmV2 pair = ISavmV2(_pairFor(tokenIn, tokenOut));
        _safeTransfer(tokenIn, address(pair), amountIn);

        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();

        if (tokenIn < tokenOut) {

            outAmount = _getAmountOut(amountIn, reserve0, reserve1);
            pair.swap(0, outAmount, to, "");

        } else {

            outAmount = _getAmountOut(amountIn, reserve1, reserve0);
            pair.swap(outAmount, 0, to, "");

        }

    }

    // Allow the owner to withdraw the funds and bridge them to mainnet.
    function withdraw(address token, address to, uint256 _value) onlyOwner external {
        if (token != address(0)) {
            _safeTransfer(token, to, _value);
        } else {
            (bool success, ) = to.call{value: _value}("");
            require(success);
        }
    }

    function doAction(address to, uint256 _value, bytes memory data) onlyOwner external {
        (bool success, ) = to.call{value: _value}(data);
        require(success);
    }

    receive() external payable {}

}