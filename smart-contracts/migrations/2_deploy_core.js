const AccessControl = artifacts.require("AccessControl");
const UserManagement = artifacts.require("UserManagement");
const ProductCatalog = artifacts.require("ProductCatalog");
const OrderManagement = artifacts.require("OrderManagement");
const VendorApplications = artifacts.require("VendorApplications");

module.exports = async function (deployer) {
  await deployer.deploy(AccessControl);
  const accessControl = await AccessControl.deployed();

  await deployer.deploy(VendorApplications, accessControl.address);
  const vendorApplications = await VendorApplications.deployed();
  await accessControl.setVendorModule(vendorApplications.address);

  await deployer.deploy(UserManagement, accessControl.address);
  await deployer.deploy(ProductCatalog, accessControl.address);
  const catalog = await ProductCatalog.deployed();

  await deployer.deploy(OrderManagement, accessControl.address, catalog.address);
};
