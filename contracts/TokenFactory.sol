// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import './test/Token.sol';

contract TokenFactory {

    event TokenCreated(address indexed sender, address token);

    function createToken(string memory name, string memory symbol, uint8 decimals, uint256 amount) external returns (address token) {
        bytes memory bytecode = type(Token).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(name, symbol, decimals, block.timestamp, msg.sender));
        assembly {
            token := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        Token(token).initialize(name, symbol, decimals, msg.sender, amount);
        emit TokenCreated(msg.sender, token);
    }

}