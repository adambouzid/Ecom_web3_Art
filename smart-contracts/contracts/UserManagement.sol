// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AccessControlled.sol";

/**
 * @title UserManagement
 * @notice Stores lightweight on-chain metadata references for registered users.
 *         The actual profile data (names, images…) is expected to live off-chain (e.g. IPFS),
 *         and this contract only keeps the URI pointer plus emitted events for indexing.
 */
contract UserManagement is AccessControlled {
    struct UserProfile {
        string metadataURI;
        bool exists;
    }

    mapping(address => UserProfile) private _profiles;

    event UserProfileUpdated(address indexed account, string metadataURI);
    event UserProfileDeleted(address indexed account);

    constructor(address accessControlAddress) AccessControlled(accessControlAddress) {}

    /**
     * @notice Upsert the metadata URI for the caller.
     *         Caller must already hold at least one role (client/vendor/admin).
     */
    function upsertProfile(string calldata metadataURI) external onlyKnownRole {
        require(bytes(metadataURI).length != 0, "UserManagement: empty metadata");
        _profiles[msg.sender] = UserProfile({metadataURI: metadataURI, exists: true});
        emit UserProfileUpdated(msg.sender, metadataURI);
    }

    /**
     * @notice Admins can set or override metadata for any account (e.g. vendor onboarding).
     */
    function adminSetProfile(address account, string calldata metadataURI) external onlyAdmin {
        require(bytes(metadataURI).length != 0, "UserManagement: empty metadata");
        _profiles[account] = UserProfile({metadataURI: metadataURI, exists: true});
        emit UserProfileUpdated(account, metadataURI);
    }

    /**
     * @notice Remove profile metadata (does not revoke roles, handled by AccessControl).
     */
    function deleteProfile(address account) external {
        require(
            msg.sender == account || accessControl.isAdmin(msg.sender),
            "UserManagement: not allowed"
        );
        require(_profiles[account].exists, "UserManagement: profile missing");
        delete _profiles[account];
        emit UserProfileDeleted(account);
    }

    function getProfile(address account) external view returns (string memory metadataURI, bool exists) {
        UserProfile memory profile = _profiles[account];
        return (profile.metadataURI, profile.exists);
    }
}
