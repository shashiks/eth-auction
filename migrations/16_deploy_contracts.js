var AuctionFactory = artifacts.require("./AuctionFactory.sol");
var SigLibrary = artifacts.require("./SigLibrary.sol");

module.exports = function(deployer) {
  deployer.deploy(SigLibrary);
  deployer.link(SigLibrary, AuctionFactory);
  deployer.deploy(AuctionFactory);
};
