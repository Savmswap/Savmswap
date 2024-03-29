// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ISavmswapV2Callee {
    function savmswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external;
}