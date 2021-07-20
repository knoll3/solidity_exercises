var Ballot = artifacts.require("./Ballot.sol");

module.exports = function (deployer) {
  var args = ["Proposal 1", "Proposal 2", "Proposal 3"].map((x) =>
    web3.utils.asciiToHex(x)
  );
  deployer.deploy(Ballot, args);
};
