const Purchase = artifacts.require("./Purchase.sol");

contract("Purchase", (accounts) => {
  let escrow = 1000000000000000000; // 1 ether

  before(async () => {});

  beforeEach(async () => {
    instance = await Purchase.new({ from: accounts[0], value: escrow });
  });

  describe("contructor()", async () => {
    it("should initialize properties", async () => {
      const seller = await instance.seller();
      const value = await instance.value();
      const state = await instance.state();

      assert.equal(seller, accounts[0]);
      assert.equal(value, escrow / 2);
      assert.equal(state, 0); // state.Created
    });

    it("should check that value is even number", async () => {
      try {
        // Try odd number
        await Purchase.new({ from: accounts[0], value: 10000001 });
        assert.fail();
      } catch (error) {
        const message = "Value has to be even.";
        assert(error.message.indexOf(message) >= 0);
      }
    });
  });

  describe("abort()", async () => {
    it("should abort the purchase", async () => {
      const balanceBefore = await web3.eth.getBalance(accounts[0]);
      await instance.abort({ from: accounts[0] });
      const balanceAfter = await web3.eth.getBalance(accounts[0]);
      const state = await instance.state();

      assert.equal(state, 3); // state.Inactive

      // Amount returned should be within 0.01 ether
      expect(balanceAfter - balanceBefore).to.be.closeTo(
        escrow,
        10000000000000000
      );
    });

    it("should emit aborted event", async () => {
      const receipt = await instance.abort({ from: accounts[0] });

      let eventExists = false;
      receipt.logs.forEach((log) => {
        eventExists = log.event == "Aborted";
      });
      assert(eventExists);
    });

    it("should only allow seller to call", async () => {
      try {
        await instance.abort({ from: accounts[1] });
        assert.fail();
      } catch (error) {
        const message = "Only seller can call this.";
        assert(error.message.indexOf(message) >= 0);
      }
    });

    it("should check that state is state.Created", async () => {
      await instance.confirmPurchase({ value: escrow });
      try {
        await instance.abort({ from: accounts[0] });
        assert.fail();
      } catch (error) {
        const message = "Invalid state.";
        assert(error.message.indexOf(message) >= 0);
      }
    });
  });

  describe("confirmPurchase()", async () => {
    it("should confirm purchase", async () => {
      await instance.confirmPurchase({ from: accounts[1], value: escrow });
      const buyer = await instance.buyer();
      const state = await instance.state();

      assert.equal(buyer, accounts[1]);
      assert.equal(state, 1); // state.Locked
    });

    it("should emit purchase confirmed event", async () => {
      const receipt = await instance.confirmPurchase({
        from: accounts[1],
        value: escrow,
      });

      let eventExists = false;
      receipt.logs.forEach((log) => {
        eventExists = log.event == "PurchaseConfirmed";
      });
      assert(eventExists);
    });

    it("should check that state is state.Created", async () => {
      await instance.confirmPurchase({ from: accounts[1], value: escrow });
      try {
        await instance.confirmPurchase({ from: accounts[1], value: escrow });
        assert.fail();
      } catch (error) {
        const message = "Invalid state.";
        assert(error.message.indexOf(message) >= 0);
      }
    });

    it("should check that value is double value stored in contract", async () => {
      try {
        await instance.confirmPurchase({ from: accounts[1], value: 30000000 });
        assert.fail();
      } catch (error) {
        assert(error);
      }
    });
  });

  describe("confirmReceived()", async () => {
    it("should allow buyer to confirm item was received", async () => {
      const balanceBefore = await web3.eth.getBalance(accounts[1]);
      await instance.confirmPurchase({ from: accounts[1], value: escrow });
      await instance.confirmReceived({ from: accounts[1] });
      const balanceAfter = await web3.eth.getBalance(accounts[1]);
      const state = await instance.state();

      assert.equal(state, 2); // state.Release
      expect(balanceBefore - balanceAfter).to.be.closeTo(
        escrow / 2,
        10000000000000000
      );
    });

    it("should emit item received event", async () => {
      await instance.confirmPurchase({ from: accounts[1], value: escrow });
      const receipt = await instance.confirmReceived({ from: accounts[1] });

      let eventExists = false;
      receipt.logs.forEach((log) => {
        eventExists = log.event == "ItemReceived";
      });
      assert(eventExists);
    });

    it("should only let buyer call", async () => {
      await instance.confirmPurchase({ from: accounts[1], value: escrow });

      try {
        await instance.confirmReceived({ from: accounts[0] });
        assert.fail();
      } catch (error) {
        const message = "Only buyer can call this.";
        assert(error.message.indexOf(message) >= 0);
      }
    });

    it("should check that state is state.Locked", async () => {
      await instance.confirmPurchase({ from: accounts[1], value: escrow });
      await instance.confirmReceived({ from: accounts[1] });

      try {
        await instance.confirmReceived({ from: accounts[1] });
        assert.fail();
      } catch (error) {
        const message = "Invalid state.";
        assert(error.message.indexOf(message) >= 0);
      }
    });
  });

  describe("refundSeller()", async () => {
    it("should refund the seller", async () => {
      await instance.confirmPurchase({ from: accounts[1], value: escrow });
      await instance.confirmReceived({ from: accounts[1] });

      const balanceBefore = await web3.eth.getBalance(accounts[0]);
      await instance.refundSeller({ from: accounts[0] });
      const balanceAfter = await web3.eth.getBalance(accounts[0]);

      const state = await instance.state();
      assert.equal(state, 3);

      expect(balanceAfter - balanceBefore).to.be.closeTo(
        escrow * 1.5,
        10000000000000000
      );
    });

    it("should emit seller refunded event", async () => {
      await instance.confirmPurchase({ from: accounts[1], value: escrow });
      await instance.confirmReceived({ from: accounts[1] });
      const receipt = await instance.refundSeller({ from: accounts[0] });

      let eventExists = false;
      receipt.logs.forEach((log) => {
        eventExists = log.event == "SellerRefunded";
      });
      assert(eventExists);
    });

    it("should only allow seller to call", async () => {
      await instance.confirmPurchase({ from: accounts[1], value: escrow });
      await instance.confirmReceived({ from: accounts[1] });
      try {
        await instance.refundSeller({ from: accounts[1] });
        assert.fail();
      } catch (error) {
        const message = "Only seller can call this.";
        assert(error.message.indexOf(message) >= 0);
      }
    });

    it("should check that state is state.Release", async () => {
      try {
        await instance.refundSeller({ from: accounts[0] });
        assert.fail();
      } catch (error) {
        const message = "Invalid state.";
        assert(error.message.indexOf(message) >= 0);
      }
    });
  });
});
