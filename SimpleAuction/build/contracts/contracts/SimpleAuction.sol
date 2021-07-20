// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.4.22 <=0.8.1;

contract SimpleAuction {

    // public properties
    address payable public beneficiary;
    uint public auctionEndTime;
    uint public highestBid;
    address public highestBidder;

    // private properties
    bool ended;

    mapping(address => uint) pendingReturns;

    // events
    event HighestBidIncreased(address bidder, uint amount);
    event AuctionEnded(address winner, uint amount);

    constructor(uint auctionLength, address payable _beneficiary) {
        auctionEndTime = block.timestamp + auctionLength;
        beneficiary = _beneficiary;
    }

    function bid() payable public {
        require(msg.value > highestBid, "There already is a higher bid.");
        require(block.timestamp <= auctionEndTime, "Auction already ended.");

        if (highestBid != 0) {
            pendingReturns[highestBidder] += highestBid;
        }

        highestBid = msg.value;
        highestBidder = msg.sender;
        
        emit HighestBidIncreased(msg.sender, msg.value);
    }

    function withdraw() public {
        uint amount = pendingReturns[msg.sender];
        if (amount > 0) {
            // prevents reentrancy attacks
            pendingReturns[msg.sender] = 0;

            (bool sent, ) = msg.sender.call{value: amount}("");
            require(sent, "Failed to send Ether");
        }
    }

    function auctionEnd() public {
        require(!ended, "auctionEnd has already been called.");
        require(block.timestamp >= auctionEndTime, "Auction not yet ended.");

        ended = true;
        emit AuctionEnded(highestBidder, highestBid);

        (bool sent, ) = beneficiary.call{value: highestBid}("");
        require(sent, "Failed to send Ether");
    }
}