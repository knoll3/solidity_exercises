const Ballot = artifacts.require("./Ballot.sol");
const testUtils = require("./test-utils");

contract("Ballot", (accounts) => {
  let instance;
  let chairperson;
  let voterAddress;
  let voter;

  before(async () => {
    chairperson = accounts[0];
    voterAddress = accounts[1];
  });

  beforeEach(async () => {
    var args = ["Proposal 1", "Proposal 2", "Proposal 3"].map((x) =>
      web3.utils.asciiToHex(x)
    );
    instance = await Ballot.new(args);
    voter = await instance.voters(voterAddress);
  });

  describe("constructor()", async () => {
    it("should give chairperson weight of 1", async () => {
      const chairpersonId = await instance.chairperson();
      const chairperson = await instance.voters(chairpersonId);
      assert.equal(chairperson.weight, 1);
    });

    it("should initialize with all 3 proposals", async () => {
      let proposal;
      let name;

      proposal = await instance.proposals(0);
      name = testUtils.hexToString(proposal.name);
      assert.equal(name, "Proposal 1", "contains the correct name");
      assert.equal(proposal.voteCount, 0, "contains the correct voteCount");

      proposal = await instance.proposals(1);
      name = testUtils.hexToString(proposal.name);
      assert.equal(name, "Proposal 2", "contains the correct name");
      assert.equal(proposal.voteCount, 0, "contains the correct voteCount");

      proposal = await instance.proposals(2);
      name = testUtils.hexToString(proposal.name);
      assert.equal(name, "Proposal 3", "contains the correct name");
      assert.equal(proposal.voteCount, 0, "contains the correct voteCount");
    });
  });

  describe("giveRightToVote()", async () => {
    it("should give voter right to vote", async () => {
      await instance.giveRightToVote(voterAddress);
      voter = await instance.voters(voterAddress);
      assert.equal(voter.weight, 1, "sets weight to 1");
    });

    it("should check that voter exists", async () => {
      try {
        await instance.giveRightToVote(
          "0x02ceA67019910DfD56AB5AbE8E9F28b1a1A57bc7",
          { from: chairperson }
        );
        assert.fail();
      } catch (error) {
        assert(
          error.message.indexOf("bad address") >= 0,
          "expected an error but didn't get one"
        );
      }
    });

    it("should only let chairperson give right to vote", async () => {
      try {
        await instance.giveRightToVote(voterAddress, {
          from: accounts[2],
        });
        assert.fail();
      } catch (error) {
        const message = "Only chairperson can give right to vote.";
        assert(
          error.message.indexOf(message) >= 0,
          "expected an error but didn't get one"
        );
      }
    });

    it("should check that voter has not already voted", async () => {
      await instance.giveRightToVote(voterAddress, { from: chairperson });
      await instance.vote(1, { from: voterAddress });
      try {
        await instance.giveRightToVote(voterAddress, {
          from: chairperson,
        });
        assert.fail();
      } catch (error) {
        const message = "The voter has already voted.";
        assert(
          error.message.indexOf(message) >= 0,
          "expected an error but didn't get one"
        );
      }
    });

    it("should check that voter has a weight of 0", async () => {
      await instance.giveRightToVote(accounts[2], { from: chairperson });
      await instance.delegate(voterAddress, { from: accounts[2] });
      try {
        await instance.giveRightToVote(voterAddress, {
          from: chairperson,
        });
        assert.fail();
      } catch (error) {
        const message = "The voter has no right to vote.";
        assert(
          error.message.indexOf(message) >= 0,
          "expected an error but didn't get one"
        );
      }
    });
  });

  describe("delegate()", async () => {
    it("should delegate vote to voter", async () => {
      const delegateIndex = 2;

      await instance.giveRightToVote(voterAddress, { from: chairperson });
      await instance.delegate(accounts[delegateIndex], { from: voterAddress });

      voter = await instance.voters(voterAddress);
      const delegate = await instance.voters(accounts[delegateIndex]);

      assert(voter.voted, "expected voter.voted to be true");
      assert.equal(
        voter.delegate,
        accounts[delegateIndex],
        "expected voter's delegate to be chosen delegate"
      );
    });

    it("should delegate full weight of sender if delegate's weight is 0", async () => {
      const firstDelegateIndex = 2;
      const secondDelegateIndex = 3;

      await instance.giveRightToVote(voterAddress, { from: chairperson });
      await instance.giveRightToVote(accounts[firstDelegateIndex], {
        from: chairperson,
      });
      await instance.delegate(accounts[firstDelegateIndex], {
        from: voterAddress,
      });
      await instance.delegate(accounts[secondDelegateIndex], {
        from: accounts[firstDelegateIndex],
      });

      const secondDelegate = await instance.voters(
        accounts[secondDelegateIndex]
      );

      assert.equal(
        secondDelegate.weight,
        2,
        "expected delegate's weight to be 2"
      );
    });

    it("should add weight to delegate's current weight", async () => {
      const firstDelegateIndex = 2;
      const secondDelegateIndex = 3;

      await instance.giveRightToVote(voterAddress, { from: chairperson });
      await instance.giveRightToVote(accounts[firstDelegateIndex], {
        from: chairperson,
      });
      await instance.giveRightToVote(accounts[secondDelegateIndex], {
        from: chairperson,
      });
      await instance.delegate(accounts[firstDelegateIndex], {
        from: voterAddress,
      });
      await instance.delegate(accounts[secondDelegateIndex], {
        from: accounts[firstDelegateIndex],
      });

      const secondDelegate = await instance.voters(
        accounts[secondDelegateIndex]
      );

      assert.equal(
        secondDelegate.weight,
        3,
        "expected delegate's weight to be 3"
      );
    });

    it("should check that voter exists", async () => {
      await instance.giveRightToVote(voterAddress, { from: chairperson });
      try {
        await instance.delegate("0x6aF62F802758FC0CefA68e91D0D2731796d58231", {
          from: voterAddress,
        });
        assert.fail;
      } catch (error) {
        assert(
          error.message.indexOf("bad address") >= 0,
          "expected to receive error because voter shouldn't exist"
        );
      }
    });

    it("should check that sender has not already voted", async () => {
      await instance.giveRightToVote(voterAddress, { from: chairperson });
      await instance.vote(1, { from: voterAddress });
      try {
        await instance.delegate(accounts[2], {
          from: voterAddress,
        });
        assert.fail();
      } catch (error) {
        const message = "You already voted.";
        assert(
          error.message.indexOf(message) >= 0,
          "expected to receive error because delegator already voted"
        );
      }
    });

    it("should not allow sender to delegate self", async () => {
      await instance.giveRightToVote(voterAddress, { from: chairperson });
      try {
        assert.fail = await instance.delegate(voterAddress, {
          from: voterAddress,
        });
      } catch (error) {
        const message = "Self-delegate is not allowed.";
        assert(
          error.message.indexOf(message) >= 0,
          "expected to receive error because a voter cannot delegate himself"
        );
      }
    });

    it("should not allow delegation loops", async () => {
      await instance.giveRightToVote(voterAddress, { from: chairperson });
      await instance.giveRightToVote(accounts[2], {
        from: chairperson,
      });

      await instance.delegate(accounts[3], { from: accounts[2] });
      await instance.delegate(voterAddress, { from: accounts[3] });

      try {
        await instance.delegate(accounts[2], {
          from: voterAddress,
        });
        assert.fail();
      } catch (error) {
        const message = "Found loop in delegation.";
        assert(
          error.message.indexOf(message) >= 0,
          "expected error because of a delegation loop"
        );
      }
    });
  });

  describe("vote()", async () => {
    it("should vote for the proposal", async () => {
      await instance.giveRightToVote(voterAddress, { from: chairperson });
      await instance.vote(0, { from: voterAddress });

      voter = await instance.voters(voterAddress);
      const proposal = await instance.proposals(0);

      assert(voter.voted), "expected voter.voted to be true";
      assert.equal(
        voter.vote,
        0,
        "expected proposal voter voted for to have an index of 0"
      );
      assert.equal(
        proposal.voteCount,
        1,
        "expected voteCount of proposal to be 1"
      );
    });

    it("should check that proposal exists", async () => {
      await instance.giveRightToVote(voterAddress, { from: chairperson });
      try {
        // This assumes there are not 2000 proposals
        await instance.vote(2000, { from: voterAddress });
        assert.fail();
      } catch (error) {
        assert(
          error,
          "expected to receive error because proposal shouldn't exist"
        );
      }
    });

    it("should check that voter has right to vote", async () => {
      try {
        await instance.vote(0, { from: voterAddress });
        assert.fail();
      } catch (error) {
        const message = "Has no right to vote.";
        assert(
          error.message.indexOf(message) >= 0,
          "expected to receive error because voter does not have the right to vote"
        );
      }
    });

    it("should check that voter has not already voted", async () => {
      await instance.giveRightToVote(voterAddress, { from: chairperson });
      await instance.vote(0, { from: voterAddress });
      try {
        await instance.vote(0, { from: voterAddress });
        assert.fail();
      } catch (error) {
        const message = "Already voted.";
        assert(
          error.message.indexOf(message) >= 0,
          "expected to receive error because voter has already voted"
        );
      }
    });
  });

  describe("winningProposal()", async () => {
    it("should return the winning proposal", async () => {
      await instance.giveRightToVote(accounts[1], { from: chairperson });
      await instance.giveRightToVote(accounts[2], { from: chairperson });
      await instance.giveRightToVote(accounts[3], { from: chairperson });
      await instance.giveRightToVote(accounts[4], { from: chairperson });
      await instance.giveRightToVote(accounts[5], { from: chairperson });

      await instance.vote(0, { from: accounts[1] });
      await instance.vote(0, { from: accounts[2] });
      await instance.vote(0, { from: accounts[3] });
      await instance.vote(1, { from: accounts[4] });
      await instance.vote(1, { from: accounts[5] });

      const winningProposal = await instance.winningProposal();
      assert.equal(winningProposal, 0);
    });
  });

  describe("winningName()", async () => {
    it("should return winning proposal name", async () => {
      await instance.giveRightToVote(accounts[1], { from: chairperson });
      await instance.giveRightToVote(accounts[2], { from: chairperson });
      await instance.giveRightToVote(accounts[3], { from: chairperson });
      await instance.giveRightToVote(accounts[4], { from: chairperson });
      await instance.giveRightToVote(accounts[5], { from: chairperson });

      await instance.vote(0, { from: accounts[1] });
      await instance.vote(0, { from: accounts[2] });
      await instance.vote(0, { from: accounts[3] });
      await instance.vote(1, { from: accounts[4] });
      await instance.vote(1, { from: accounts[5] });

      const winningHex = await instance.winnerName();
      const winningName = testUtils.hexToString(winningHex);

      assert.equal(winningName, "Proposal 1");
    });
  });
});
