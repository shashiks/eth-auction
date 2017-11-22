pragma solidity ^0.4.11;

import './Auction.sol';

/**
* Instance of this will be per auction
* It holds all the money during bidding of each auction
* and finally refunds the balances as applicable to the bidders
*/
contract AuctionEscrow {

	address private auctioneer;
	Auction private auction;

	function AuctionEscrow(address _actioneer, Auction _auction) public {
		auctioneer = _actioneer;
		auction = _auction;
	}


	function payForTickets() public payable {

		//check that auction has expired
		if(!auction.isActive()) {
		    uint32 bidTotal = auction.getPayableBidsTotal(msg.sender);
			//accept payment for all tickets only
			if(bidTotal > 0 && bidTotal == msg.value) {
				auctioneer.transfer(msg.value);
				// do something to send eTickets to bidder
				
			} else {//dont accept money if total is less
			    revert();
			}
		}
	}

}