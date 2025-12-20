// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AccessControl
 * @notice Minimal role management shared across the platform.
 *         Roles are mutually exclusive for simplicity (Admin, Vendor, Client).
 */
contract AccessControl {
    enum Role {
        None,
        Admin,
        Vendor,
        Client
    }

    mapping(address => Role) private _roles;
    mapping(address => bool) private _vendorActive;
    address public vendorModule;

    event RoleGranted(address indexed account, Role role);
    event RoleRevoked(address indexed account, Role previousRole);
    event VendorStatusChanged(address indexed vendor, bool active);

    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AccessControl: admin only");
        _;
    }

    constructor() {
        _grantRole(msg.sender, Role.Admin);
    }

    function registerClient() external {
        require(_roles[msg.sender] == Role.None, "AccessControl: already registered");
        _grantRole(msg.sender, Role.Client);
    }

    function grantAdmin(address account) external onlyAdmin {
        _grantRole(account, Role.Admin);
    }

    function setVendorModule(address module) external onlyAdmin {
        vendorModule = module;
    }
    
    function vendorModuleAddress() external view returns (address) {
        return vendorModule;
    }

    function grantVendor(address account) external onlyAdmin {
        _grantVendor(account);
    }

    function grantVendorFromModule(address account) external {
        require(msg.sender == vendorModule, "AccessControl: module only");
        _grantVendor(account);
    }

    function _grantVendor(address account) internal {
        _grantRole(account, Role.Vendor);
        _vendorActive[account] = true;
        emit VendorStatusChanged(account, true);
    }

    function setVendorActive(address vendor, bool active) external onlyAdmin {
        require(_roles[vendor] == Role.Vendor, "AccessControl: not vendor");
        _vendorActive[vendor] = active;
        emit VendorStatusChanged(vendor, active);
    }

    function revokeRole(address account) external onlyAdmin {
        Role previousRole = _roles[account];
        require(previousRole != Role.None, "AccessControl: no role");
        _roles[account] = Role.None;
        if (previousRole == Role.Vendor) {
            _vendorActive[account] = false;
            emit VendorStatusChanged(account, false);
        }
        emit RoleRevoked(account, previousRole);
    }

    function renounceRole() external {
        Role previousRole = _roles[msg.sender];
        require(previousRole != Role.None, "AccessControl: no role");
        _roles[msg.sender] = Role.None;
        if (previousRole == Role.Vendor) {
            _vendorActive[msg.sender] = false;
            emit VendorStatusChanged(msg.sender, false);
        }
        emit RoleRevoked(msg.sender, previousRole);
    }

    function roleOf(address account) external view returns (Role) {
        return _roles[account];
    }

    function isAdmin(address account) public view returns (bool) {
        return _roles[account] == Role.Admin;
    }

    function isVendor(address account) public view returns (bool) {
        return _roles[account] == Role.Vendor && _vendorActive[account];
    }

    function isClient(address account) public view returns (bool) {
        return _roles[account] == Role.Client;
    }

    function vendorActive(address vendor) external view returns (bool) {
        return _vendorActive[vendor];
    }

    function _grantRole(address account, Role role) internal {
        _roles[account] = role;
        if (role != Role.Vendor) {
            _vendorActive[account] = false;
        }
        emit RoleGranted(account, role);
    }
}
