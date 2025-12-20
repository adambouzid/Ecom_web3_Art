// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AccessControlled.sol";

/**
 * @title VendorApplications
 * @notice Handles vendor candidatures with a refundable stake and admin approval.
 */
contract VendorApplications is AccessControlled {
    enum Status {
        None,
        Pending,
        Approved,
        Rejected
    }

    struct Application {
        address applicant;
        string metadataURI;
        uint256 stake;
        Status status;
    }

    uint256 public constant STAKE_REQUIRED = 5 ether;

    mapping(address => Application) private _applications;

    event VendorApplied(address indexed applicant, string metadataURI, uint256 stake);
    event VendorApproved(address indexed applicant);
    event VendorRejected(address indexed applicant, uint256 refund);
    event TreasuryWithdrawn(address indexed to, uint256 amount);

    constructor(address accessControlAddress) AccessControlled(accessControlAddress) {}

    function getApplication(address applicant) external view returns (Application memory) {
        return _applications[applicant];
    }

    function applyAsVendor(string calldata metadataURI) external payable {
        require(bytes(metadataURI).length > 0, "VendorApplications: metadata required");
        require(msg.value == STAKE_REQUIRED, "VendorApplications: incorrect stake");
        require(!accessControl.isVendor(msg.sender), "VendorApplications: already vendor");

        Application storage existing = _applications[msg.sender];
        require(existing.status != Status.Pending, "VendorApplications: already pending");

        _applications[msg.sender] = Application({
            applicant: msg.sender,
            metadataURI: metadataURI,
            stake: msg.value,
            status: Status.Pending
        });

        emit VendorApplied(msg.sender, metadataURI, msg.value);
    }

    function approveVendor(address applicant) external onlyAdmin {
        Application storage application = _applications[applicant];
        require(application.status == Status.Pending, "VendorApplications: not pending");

        accessControl.grantVendorFromModule(applicant);
        application.status = Status.Approved;

        emit VendorApproved(applicant);
    }

    function rejectVendor(address applicant) external onlyAdmin {
        Application storage application = _applications[applicant];
        require(application.status == Status.Pending, "VendorApplications: not pending");
        uint256 refund = application.stake;
        application.status = Status.Rejected;
        application.stake = 0;

        (bool ok, ) = applicant.call{value: refund}("");
        require(ok, "VendorApplications: refund failed");

        emit VendorRejected(applicant, refund);
    }

    function withdrawTreasury(address payable to, uint256 amount) external onlyAdmin {
        require(to != address(0), "VendorApplications: zero address");
        require(amount > 0, "VendorApplications: zero amount");
        require(address(this).balance >= amount, "VendorApplications: insufficient funds");

        (bool ok, ) = to.call{value: amount}("");
        require(ok, "VendorApplications: withdraw failed");

        emit TreasuryWithdrawn(to, amount);
    }
}
