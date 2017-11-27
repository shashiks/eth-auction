var SigVerify = artifacts.require("./SigVerify.sol");

module.exports = function(deployer) {
	deployer.deploy(SigVerify);
};
