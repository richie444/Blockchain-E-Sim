// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AccountAbstraction
 * @dev Simple placeholder contract for account abstraction functionality
 */
contract AccountAbstraction {
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}