// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract Purchase {

    enum State { Created, Locked, Release, Inactive }

    address payable public seller;
    address payable public buyer;
    uint public value;
    State public state;

    modifier onlySeller {
        require(msg.sender == seller, "Only seller can call this.");
        _;
    }

    modifier onlyBuyer {
        require(msg.sender == buyer, "Only buyer can call this.");
        _;
    }

    modifier inState(State _state) {
        require(state == _state, "Invalid state.");
        _;
    }

    event Aborted();
    event PurchaseConfirmed();
    event ItemReceived();
    event SellerRefunded();

    constructor() payable {
        require(msg.value % 2 == 0, "Value has to be even.");
        seller = payable(msg.sender);
        value = msg.value / 2;
    }

    function abort() payable public onlySeller inState(State.Created) {
        emit Aborted();

        state = State.Inactive;
        seller.transfer(address(this).balance);
    }

    function confirmPurchase() payable public inState(State.Created) {
        require(msg.value == value * 2);

        emit PurchaseConfirmed();

        buyer = payable(msg.sender);
        state = State.Locked;
    }

    function confirmReceived() payable public onlyBuyer inState(State.Locked) {
        emit ItemReceived();

        state = State.Release;
        buyer.transfer(value);
    }

    function refundSeller() payable public onlySeller inState(State.Release) {
        emit SellerRefunded();

        state = State.Inactive;
        seller.transfer(value * 3);
    }
}

