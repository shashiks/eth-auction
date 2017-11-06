var ProductFactory = artifacts.require("./ProductFactory.sol");

module.exports = function(deployer) {
	deployer.deploy(ProductFactory, {gas:4555000});
};
