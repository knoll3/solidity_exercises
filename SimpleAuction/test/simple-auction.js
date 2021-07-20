const SimpleAuction = artifacts.require("./SimpleAuction.sol");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

contract("SimpleAuction", (accounts) => {
    let beneficiary;
    let startedTime;
    let mainBidder;

    before(async () => {
        beneficiary = accounts[0];
    });

    beforeEach(async () => {
        instance = await SimpleAuction.new(60, beneficiary);
        mainBidder = accounts[0];
        startedTime = Math.floor(Date.now() / 1000);
    });

    describe("contructor()", async () => {
        it("should initialize properties", async () => {
            const expectedBeneficiary = await instance.beneficiary();
            const auctionEndTime = await instance.auctionEndTime();

            assert.equal(expectedBeneficiary, expectedBeneficiary);
            expect(auctionEndTime.toNumber()).to.be.closeTo(
                startedTime + 60,
                1
            );
        });
    });

    describe("bid()", async () => {
        it("should make a bid", async () => {
            const bid = 1000000; // 1 million
            const receipt = await instance.bid({
                from: mainBidder,
                value: bid,
            });

            const highestBidder = await instance.highestBidder();
            const highestBid = await instance.highestBid();

            assert.equal(highestBidder, mainBidder);
            assert.equal(highestBid, bid);
        });

        it("should emit HighestBidIncreased event", async () => {
            const bid = 1000000; // 1 million
            const receipt = await instance.bid({
                from: mainBidder,
                value: bid,
            });

            let eventExists = false;
            receipt.logs.forEach((log) => {
                eventExists = log.event == "HighestBidIncreased";
            });
            assert(eventExists);
        });

        it("should only bid if auction has not ended", async () => {
            // Create an auction that ends immediately
            instance = await SimpleAuction.new(0, beneficiary);

            // wait 1 second to make sure the auction ends
            await sleep(1000);

            try {
                const bid = 1000000; // 1 million
                await instance.bid({ from: mainBidder, value: bid });
                assert.fail();
            } catch (error) {
                const message = "Auction already ended.";
                assert(error.message.indexOf(message) >= 0);
            }
        });

        it("should only bid if bid is higher than current highest bid", async () => {
            await instance.bid({ from: accounts[0], value: 1000000 });
            try {
                await instance.bid({ from: accounts[1], value: 5000 });
                assert.fail();
            } catch (error) {
                const message = "There already is a higher bid.";
                assert(error.message.indexOf(message) >= 0);
            }
        });
    });

    describe("withdraw()", async () => {
        it("should withdraw a bid", async () => {
            const balanceBefore = await web3.eth.getBalance(accounts[0]);

            await instance.bid({
                from: accounts[0],
                value: 5000000000000000000,
            }); // 5 ether
            await instance.bid({
                from: accounts[1],
                value: 6000000000000000000,
            }); // 6 ether

            await instance.withdraw({ from: accounts[0] });

            const balanceAfter = await web3.eth.getBalance(accounts[0]);

            // Should be within 0.001 ether
            expect(balanceBefore - balanceAfter).to.be.closeTo(
                0,
                10000000000000000
            );
        });

        it("should prevent reentrancy attacks", async () => {
            const balanceBefore = await web3.eth.getBalance(accounts[0]);

            await instance.bid({
                from: accounts[0],
                value: 5000000000000000000,
            }); // 5 ether
            await instance.bid({
                from: accounts[1],
                value: 6000000000000000000,
            }); // 6 ether

            // Intentionally call withdraw synchronously to simulate a reentrancy attack
            instance.withdraw({ from: accounts[0] });
            await instance.withdraw({ from: accounts[0] });

            const balanceAfter = await web3.eth.getBalance(accounts[0]);

            // Should be within 0.001 ether
            expect(balanceBefore - balanceAfter).to.be.closeTo(
                0,
                10000000000000000
            );
        });
    });

    describe("auctionEnd()", async () => {
        it("should pay beneficiary", async () => {
            const balanceBefore = await web3.eth.getBalance(beneficiary);
            const amount = 5000000000000000000; // 5 ether

            instance = await SimpleAuction.new(0, beneficiary);
            await instance.bid({ from: accounts[1], value: amount });
            await sleep(1000);
            const receipt = await instance.auctionEnd();

            const balanceAfter = await web3.eth.getBalance(beneficiary);

            // Should be within 0.1 ether
            expect(balanceAfter - balanceBefore).to.be.closeTo(
                amount,
                100000000000000000
            );

            // Test that event was emitted
            // Putting this here so we don't have to sleep an extra second
            let eventExists = false;
            receipt.logs.forEach((log) => {
                eventExists = log.event == "AuctionEnded";
            });
            assert(eventExists);
        });

        it("should not end auction if not time to end", async () => {
            try {
                await instance.auctionEnd();
                assert.fail();
            } catch (error) {
                const message = "Auction not yet ended.";
                assert(error.message.indexOf(message) >= 0);
            }
        });

        it("should not try to end if auction already ended", async () => {
            instance = await SimpleAuction.new(0, beneficiary);
            await sleep(1000);
            await instance.auctionEnd();
            try {
                await instance.auctionEnd();
                assert.fail();
            } catch (error) {
                const message = "auctionEnd has already been called";
                assert(error.message.indexOf(message) >= 0);
            }
        });
    });
});
