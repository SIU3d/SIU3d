// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title InfinityWarranty (EverLock) prototype contract
/// @notice Demonstrates how upgrade rights could be anchored on-chain for future integration.
contract InfinityWarranty {
    struct UpgradeRight {
        uint256 originalPrice;
        uint256 currentGeneration;
        uint256 createdAt;
    }

    // Mapping of user => product line identifier => upgrade right data
    mapping(address => mapping(uint256 => UpgradeRight)) private rights;

    event UpgradeRightSet(address indexed user, uint256 indexed productLineId, uint256 originalPrice, uint256 generation);

    /// @notice Configure or replace an upgrade right for a user and product line.
    /// @dev Intended to be called by an admin/backend service; access control omitted for MVP.
    function setUpgradeRight(
        address user,
        uint256 productLineId,
        uint256 originalPrice,
        uint256 generation
    ) external {
        rights[user][productLineId] = UpgradeRight({
            originalPrice: originalPrice,
            currentGeneration: generation,
            createdAt: block.timestamp
        });
        emit UpgradeRightSet(user, productLineId, originalPrice, generation);
    }

    /// @notice Pure helper to calculate the upgrade fee given locked price and recovery value.
    /// @param originalPrice The price locked in when the user first joined the program.
    /// @param recoveryValue The value recovered from returning the previous hardware.
    /// @return fee The upgrade fee (never negative).
    function calculateUpgradeFee(uint256 originalPrice, uint256 recoveryValue) public pure returns (uint256 fee) {
        if (recoveryValue >= originalPrice) {
            return 0;
        }
        return originalPrice - recoveryValue;
    }

    /// @notice Fetch the upgrade right for a user and product line.
    function getUpgradeRight(address user, uint256 productLineId)
        public
        view
        returns (uint256 originalPrice, uint256 currentGeneration, uint256 createdAt)
    {
        UpgradeRight memory right = rights[user][productLineId];
        return (right.originalPrice, right.currentGeneration, right.createdAt);
    }
}
