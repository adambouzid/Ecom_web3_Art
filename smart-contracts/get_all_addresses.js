const AccessControl = artifacts.require("AccessControl");
const VendorApplications = artifacts.require("VendorApplications");
const UserManagement = artifacts.require("UserManagement");
const ProductCatalog = artifacts.require("ProductCatalog");
const OrderManagement = artifacts.require("OrderManagement");

module.exports = async function (callback) {
    try {
        const ac = await AccessControl.deployed();
        const va = await VendorApplications.deployed();
        const um = await UserManagement.deployed();
        const pc = await ProductCatalog.deployed();
        const om = await OrderManagement.deployed();

        const fs = require('fs');
        const addresses = {
            AccessControl: ac.address,
            VendorApplications: va.address,
            UserManagement: um.address,
            ProductCatalog: pc.address,
            OrderManagement: om.address
        };
        console.log(JSON.stringify(addresses, null, 2));
        fs.writeFileSync('addresses.json', JSON.stringify(addresses, null, 2));

    } catch (error) {
        console.error(error);
    }
    callback();
};
