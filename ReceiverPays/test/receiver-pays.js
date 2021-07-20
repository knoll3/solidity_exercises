const ReceiverPays = artifacts.require("./ReceiverPays.sol");
const ecsign = require("ethereumjs-util").ecsign;
const toRpcSig = require("ethereumjs-util").toRpcSig;

// From example at https://docs.soliditylang.org/en/v0.8.2/solidity-by-example.html
function signPayment(signer, recipient, amount, nonce, contractAddress) {
  var hash =
    "0x" +
    web3.utils
      .soliditySha3(
        { type: "address", value: recipient },
        { type: "uint256", value: amount },
        { type: "uint256", value: nonce },
        { type: "address", value: contractAddress }
      )
      .toString("hex");

  var msgHash = EthUtil.hashPersonalMessage(Buffer.from(messageToSign));
  const privateKey =
    "43f2ee33c522046e80b67e96ceb84a05b60b9434b0ee2e3ae4b1311b9f5dcc46";
  const signature = ecsign(hash, Buffer.from(privateKey, "hex"));
  console.log(signature);
  // const rpc = toRpcSig

  // return web3.eth.personal.sign(hash, signer);
}

contract("ReceiverPays", (accounts) => {
  let instance;
  let storedAmount = 10000000000000000000; // 10 ether
  // let storedAmount = web3.utils.unitMap["ether"];

  before(async () => {});

  beforeEach(async () => {
    instance = await ReceiverPays.new({
      from: accounts[0],
      value: storedAmount,
    });
  });

  describe("claimPayment()", async () => {
    it("should claim payment", async () => {
      const signer = accounts[0];
      const recipient = accounts[1];
      const amount = 642373629948500; // approx $10 USD
      const nonce = 0;
      const contractAddress = instance.address;

      signPayment(signer, recipient, amount, nonce, contractAddress);

      // try {
      //   await signPayment(signer, recipient, amount, nonce, contractAddress);
      // } catch (error) {
      //   console.log(error);
      // }
    });
  });

  describe("shutdown()", async () => {});
});
