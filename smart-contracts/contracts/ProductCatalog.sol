// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AccessControlled.sol";

/**
 * @title ProductCatalog
 * @notice Manages vendor products stored on-chain (lightweight metadata pointer + pricing).
 *         Rich content (images, specs) should live off-chain; this contract emits events for indexing.
 */
contract ProductCatalog is AccessControlled {
    struct Product {
        uint256 id;
        address vendor;
        string metadataURI;
        uint256 price; // price per unit in wei
        uint256 quantity;
        bool active;
    }

    uint256 private _nextProductId = 1;
    mapping(uint256 => Product) private _products;

    event ProductCreated(
        uint256 indexed productId,
        address indexed vendor,
        string metadataURI,
        uint256 price,
        uint256 quantity
    );
    event ProductUpdated(
        uint256 indexed productId,
        string metadataURI,
        uint256 price,
        uint256 quantity
    );
    event ProductStatusChanged(uint256 indexed productId, bool active);

    constructor(address accessControlAddress) AccessControlled(accessControlAddress) {}

    function createProduct(
        string calldata metadataURI,
        uint256 price,
        uint256 quantity
    ) external onlyVendor returns (uint256 productId) {
        require(bytes(metadataURI).length != 0, "ProductCatalog: empty metadata");
        require(price > 0, "ProductCatalog: price zero");
        require(quantity > 0, "ProductCatalog: quantity zero");

        productId = _nextProductId++;
        _products[productId] = Product({
            id: productId,
            vendor: msg.sender,
            metadataURI: metadataURI,
            price: price,
            quantity: quantity,
            active: true
        });
        emit ProductCreated(productId, msg.sender, metadataURI, price, quantity);
    }

    function updateProduct(
        uint256 productId,
        string calldata metadataURI,
        uint256 price,
        uint256 quantity
    ) external onlyVendor {
        Product storage product = _products[productId];
        require(product.vendor == msg.sender, "ProductCatalog: not owner");
        require(bytes(metadataURI).length != 0, "ProductCatalog: empty metadata");
        require(price > 0, "ProductCatalog: price zero");
        require(quantity > 0, "ProductCatalog: quantity zero");

        product.metadataURI = metadataURI;
        product.price = price;
        product.quantity = quantity;
        emit ProductUpdated(productId, metadataURI, price, quantity);
    }

    function setProductActive(uint256 productId, bool active) external {
        Product storage product = _products[productId];
        require(product.vendor != address(0), "ProductCatalog: missing product");
        require(
            msg.sender == product.vendor || accessControl.isAdmin(msg.sender),
            "ProductCatalog: not allowed"
        );
        product.active = active;
        emit ProductStatusChanged(productId, active);
    }

    function decrementInventory(uint256 productId, uint256 quantity) external onlyAdmin {
        Product storage product = _products[productId];
        require(product.vendor != address(0), "ProductCatalog: missing product");
        require(product.quantity >= quantity, "ProductCatalog: insufficient inventory");
        product.quantity -= quantity;
        emit ProductUpdated(productId, product.metadataURI, product.price, product.quantity);
    }

    function getProduct(uint256 productId) external view returns (Product memory) {
        Product memory product = _products[productId];
        require(product.vendor != address(0), "ProductCatalog: missing product");
        return product;
    }

    function productPrice(uint256 productId) external view returns (uint256) {
        Product memory product = _products[productId];
        require(product.vendor != address(0), "ProductCatalog: missing product");
        return product.price;
    }

    function productAvailable(uint256 productId) external view returns (bool) {
        Product memory product = _products[productId];
        return product.vendor != address(0) && product.active && product.quantity > 0;
    }
}
