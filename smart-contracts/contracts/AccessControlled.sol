// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AccessControl.sol";

/**
 * @title AccessControlled
 * @notice Helper base contract that wires the shared AccessControl instance
 *         and exposes convenience modifiers for derived contracts.
 */
abstract contract AccessControlled {
    AccessControl public immutable accessControl;

    constructor(address accessControlAddress) {
        require(accessControlAddress != address(0), "AccessControlled: zero address");
        accessControl = AccessControl(accessControlAddress);
    }

    modifier onlyAdmin() {
        require(accessControl.isAdmin(msg.sender), "AccessControlled: admin only");
        _;
    }

    modifier onlyVendor() {
        require(accessControl.isVendor(msg.sender), "AccessControlled: vendor only");
        _;
    }

    modifier onlyClient() {
        require(accessControl.isClient(msg.sender), "AccessControlled: client only");
        _;
    }

    modifier onlyKnownRole() {
        require(
            accessControl.isAdmin(msg.sender) ||
                accessControl.isVendor(msg.sender) ||
                accessControl.isClient(msg.sender),
            "AccessControlled: unregistered"
        );
        _;
    }
}
