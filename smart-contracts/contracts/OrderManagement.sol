// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AccessControlled.sol";
import "./ProductCatalog.sol";

/**
 * @title OrderManagement
 * @notice Handles order creation between clients and vendors while keeping
 *         lightweight metadata and emitting events that a backend indexer can enrich.
 */
contract OrderManagement is AccessControlled {
    struct Order {
        uint256 id;
        address buyer;
        address vendor;
        uint256 productId;
        uint256 quantity;
        uint256 totalPrice;
        OrderStatus status;
        string metadataURI;
    }

    enum OrderStatus {
        Pending,
        Approved,
        Shipped,
        Cancelled
    }

    ProductCatalog public catalog;
    uint256 private _nextOrderId = 1;
    mapping(uint256 => Order) private _orders;

    event OrderCreated(
        uint256 indexed orderId,
        address indexed buyer,
        address indexed vendor,
        uint256 productId,
        uint256 quantity,
        uint256 totalPrice,
        string metadataURI
    );
    event OrderStatusUpdated(uint256 indexed orderId, OrderStatus status);

    constructor(address accessControlAddress, address catalogAddress)
        AccessControlled(accessControlAddress)
    {
        require(catalogAddress != address(0), "OrderManagement: zero catalog");
        catalog = ProductCatalog(catalogAddress);
    }

    function createOrder(
        uint256 productId,
        uint256 quantity,
        string calldata metadataURI
    ) external onlyClient returns (uint256 orderId) {
        require(quantity > 0, "OrderManagement: quantity zero");
        require(bytes(metadataURI).length != 0, "OrderManagement: empty metadata");

        ProductCatalog.Product memory product = catalog.getProduct(productId);
        require(product.active, "OrderManagement: product inactive");
        require(product.quantity >= quantity, "OrderManagement: insufficient stock");
        uint256 totalPrice = product.price * quantity;

        orderId = _nextOrderId++;
        _orders[orderId] = Order({
            id: orderId,
            buyer: msg.sender,
            vendor: product.vendor,
            productId: productId,
            quantity: quantity,
            totalPrice: totalPrice,
            status: OrderStatus.Pending,
            metadataURI: metadataURI
        });

        catalog.decrementInventory(productId, quantity);
        emit OrderCreated(orderId, msg.sender, product.vendor, productId, quantity, totalPrice, metadataURI);
    }

    function updateStatus(uint256 orderId, OrderStatus status) external {
        Order storage order_ = _orders[orderId];
        require(order_.vendor != address(0), "OrderManagement: missing order");
        require(
            msg.sender == order_.vendor || accessControl.isAdmin(msg.sender),
            "OrderManagement: not allowed"
        );
        order_.status = status;
        emit OrderStatusUpdated(orderId, status);
    }

    function cancelOrder(uint256 orderId) external {
        Order storage order_ = _orders[orderId];
        require(order_.vendor != address(0), "OrderManagement: missing order");
        require(order_.buyer == msg.sender, "OrderManagement: not buyer");
        require(order_.status == OrderStatus.Pending, "OrderManagement: already processed");
        order_.status = OrderStatus.Cancelled;
        emit OrderStatusUpdated(orderId, OrderStatus.Cancelled);
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        Order memory order_ = _orders[orderId];
        require(order_.vendor != address(0), "OrderManagement: missing order");
        return order_;
    }
}
