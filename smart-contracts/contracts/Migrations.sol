// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @dev Standard Truffle migrations contract.
 */
contract Migrations {
    address public owner;
    uint256 public lastCompletedMigration;

    modifier restricted() {
        require(msg.sender == owner, "Migrations: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setCompleted(uint256 completed) external restricted {
        lastCompletedMigration = completed;
    }

    function upgrade(address newAddress) external restricted {
        Migrations upgraded = Migrations(payable(newAddress));
        upgraded.setCompleted(lastCompletedMigration);
    }
}
