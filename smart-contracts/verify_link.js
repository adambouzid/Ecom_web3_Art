const ProductCatalog = artifacts.require("ProductCatalog");
const OrderManagement = artifacts.require("OrderManagement");

module.exports = async function (callback) {
    try {
        const catalog = await ProductCatalog.deployed();
        const orderMgmt = await OrderManagement.deployed();

        console.log("ProductCatalog Address:", catalog.address);
        console.log("OrderManagement Address:", orderMgmt.address);

        const authorized = await catalog.orderManagement();
        console.log("Authorized OrderManagement in Catalog:", authorized);

        if (authorized === orderMgmt.address) {
            console.log("SUCCESS: OrderManagement is correctly authorized.");
        } else {
            console.log("FAILURE: Authorization mismatch!");
        }
    } catch (error) {
        console.error(error);
    }
    callback();
};
