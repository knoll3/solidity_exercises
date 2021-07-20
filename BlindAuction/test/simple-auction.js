const BlindAuction = artifacts.require("./BlindAuction.sol");

// helper function
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

contract("BlindAuction", (accounts) => {
  let beneficiary;
  let biddingTime;
  let revealTime;

  before(async () => {
    beneficiary = accounts[0];
    biddingTime = 60;
    revealTime = 10;
  });

  beforeEach(async () => {
    instance = await BlindAuction.new(biddingTime, revealTime, beneficiary);
    startedTime = Math.floor(Date.now() / 1000);
  });

  describe("contructor()", async () => {
    it("should initialize properties", async () => {
      const _beneficiary = await instance.beneficiary();
      const biddingEnd = await instance.biddingEnd();
      const revealEnd = await instance.revealEnd();

      assert.equal(_beneficiary, beneficiary);
      assert.equal(biddingEnd, startedTime + biddingTime);
      assert.equal(revealEnd, startedTime + biddingTime + revealTime);
    });
  });

  describe("bid()", async () => {
    it("should place bid", async () => {
      const hash = web3.utils.keccak256("data that doesn't matter");
      await instance.bid(hash, { from: accounts[0], value: 1000000 });
      const firstBid = await instance.bids(accounts[0], 0);
      assert.equal(firstBid.blindedBid, hash);
      assert.equal(firstBid.deposit, 1000000);
    });

    xit("should only place bid before bidding end", async () => {
      instance = await BlindAuction.new(0, revealTime, beneficiary);
      await sleep(1000);
      const hash = web3.utils.keccak256("data that doesn't matter");
      try {
        await instance.bid(hash, { from: accounts[0], value: 1000000 });
        assert.fail();
      } catch (error) {
        assert(error);
      }
    });
  });

  describe("reveal()", async () => {
    it("should reveal blinded bids", async () => {
      instance = await BlindAuction.new(0, revealTime, beneficiary);
      // value: 1000000
      // fake: false
      // secret: string
    });
  });

  describe("withdraw()", async () => {});

  describe("auctionEnd()", async () => {});
});
