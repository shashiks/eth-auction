// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css"
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'
// Import our contract artifacts and turn them into usable abstractions.
import auctionFactory from '../../build/contracts/AuctionFactory.json'
import auction from '../../build/contracts/Auction.json'
import escrow from '../../build/contracts/AuctionEscrow.json'

var AuctionFactory = contract(auctionFactory);
var Auction = contract(auction);
var AuctionEscrow = contract(escrow);

var watching = 0; //start watching to events only 
var passwd = false;



$( document ).ready(function() {
   window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8080"));
   AuctionFactory.setProvider(web3.currentProvider);
   Auction.setProvider(web3.currentProvider);
   AuctionEscrow.setProvider(web3.currentProvider);
   console.warn("webb3 connected  " + web3 );

   $("#div_pass").hide();

});


function clear() {
	$("#msg").text('');
}

function writeMsg(msg, isErr, append) {

	if(isErr) {
	 	msg = "<font color='red'>" + msg + "</font>";
	}

	msg = "<p>" + msg + "</p>";

	if(append)
		$("#msg").append(msg);
	else	
		$("#msg").html(msg);

}


/**
 Bid for the user id entered in the bidder box and:
 1. start listening for events
 2. check for transation confirmation upto X blocks for Y seconds
*/
window.bid = function(phrase) {
	clear();
	//clear old messages
	let bidder = $('#bidder').val();
	let bidAmount = $('#bidAmount').val();
	let auctioneerId = $('#auctioneerId').val();
	
	// console.log("Bid details " + bidAmount + " " + bidder + " " + auctioneerId);
	if(!unlockaccount(bidder, phrase)) {
		return;
	}

	AuctionFactory.deployed().then(function(factInstance) {
		factInstance.getAuction.call(auctioneerId).then(function(itemId) {
			var bidAuction = Auction.at(itemId);
			// var blockNumber = 0;
			//register for all events of Auction

			var txnHash = bidAuction.bid.sendTransaction(bidAmount, {gas: 4000000, from:bidder}).then(function(txnHash) {
				writeMsg("Transaction Id " + txnHash, false, false);
				//Magic Numbers : wait for 3 confirmations at 4000ms intervals for 4 repetitions
				//these three params should be configs. change to 12 confirmations eventually
				awaitBlockConsensus(web3, txnHash, 3, 4000, 4, function(err, receipt) { 
					// console.log("Got result from block confirmation");
					if(receipt) {
						console.log("receipt blockHash " + receipt.blockHash);
						console.log("receipt blockNumber " + receipt.blockNumber);
						console.log("receipt transactionIndex " + receipt.transactionIndex);						
					} else {
						console.log("err from poll " + err);
					}
				});
			});
		})
	});

} //bid function




window.watchEvents = function(bidAuction, itemId) {

	var bidEvent = bidAuction.BidCreated({fromBlock: 'latest', toBlock: 'latest', address : itemId});
    bidEvent.watch(function(error, result){
        if(!error) {
        	writeMsg("Bid received for Ticket Id " + result.args.pTicketId + " of amount " + result.args.bidAmount+ " from address " + result.args.bidder, false, true);
        } else {
        	writeMsg("Err in BidCreated event "+ error, true, true);
        }
    });

	var highEvent = bidAuction.HighestBid({fromBlock: 'latest', toBlock: 'latest', address : itemId});
    highEvent.watch(function(error, result){
        if(!error) {
        	writeMsg("Highest bid received for Ticket Id " + result.args.pTicketId + " of amount " + result.args.bidAmount + " from address " + result.args.bidder, false, true);
        } else {
        	writeMsg("Err in Highest Bid event "+ error, true, true);
        }
    });

	var errEvent = bidAuction.BidError({fromBlock: 'latest', toBlock: 'latest', address : itemId});
    errEvent.watch(function(error, result){
        if(!error) {
        	writeMsg(" Invalid Bid of amount " + result.args.bidAmount
        	+ " from address " + result.args.bidder + " <p> Error:  " +  getErrMsg(result.args.errorCode.toString()), true, true);
        }
        else {
        	writeMsg("Err in BidError event "+ error, true, true);
        }
    });

    var tktEvent = bidAuction.TicketAlloted({fromBlock: 'latest', toBlock: 'latest', address : itemId});
    tktEvent.watch(function(error, result){
        if(!error) {
        	writeMsg("Ticket Id " + result.args.pTicketId + " alloted to " + result.args.bidder+ " for amount " + result.args.bidAmount, false, true);
        } else {
        	writeMsg("Err in TicketAlloted event "+ error, true, true);
        }
    });


 } /// watch Events


function getErrMsg(errCode){
	
	var resMsg = errCode + " : ";
	if(errCode == '100' ) {
		resMsg += "Bid Amount cannot be less than minimum bid amount";
	} else if(errCode == '101'|| errCode == '500') {
		resMsg += "The Auction has expired!";
	} else if(errCode == '102') {
		resMsg += "Bidder has been alloted maximum allowed tickets for this Auction";
	} else if(errCode == '103') {
		resMsg += "Current bid cannot be less than previous bid for this ticket";
	}
	return resMsg;
}



/*
* Get the details of auction for current user
*/
window.getAuctionDetails = function() {
		let auctioneerId = $('#auctioneerId').val();
		
		AuctionFactory.deployed().then(function(factoryInstance) {
			factoryInstance.getAuction.call(auctioneerId).then(function(result) {
				// console.warn("address of auction for  " + auctioneerId + " is " + result);
				$("#div_auction_id").html(result);
				var myAuction = Auction.at(result);

				if(!watching) {
					watchEvents(myAuction, result);
					watching = 1;
				}


				myAuction.balanceTikets.call().then(function(bal) {
					$("#div_tkt_balance").html(bal.toString());
					console.log('actioneer id ' + auctioneerId);
				});

				myAuction.totalTickets.call().then(function(totalTickets) {
					$("#div_total_tkt").html(totalTickets+"");
				});

				myAuction.ticketPerPerson.call().then(function(ticketPerPerson) {
					$("#div_tkt_per_person").html(ticketPerPerson+"");
				});
				myAuction.lastBidder.call().then(function(lastBidder) {
					$("#div_last_bidder").html(lastBidder);
				});

				myAuction.lastBid.call().then(function(lastBid) {
					$("#div_last_bid").html(lastBid.toString());	
				});
				myAuction.highestBidder.call().then(function(highestBidder) {
					$("#div_highest_bidder").html(highestBidder);
				});

				myAuction.highestBid.call().then(function(highestBid) {
					$("#div_highest_bid").html(highestBid.toString());
				});
				myAuction.isActive.call().then(function(status) {
					$("#div_status").html(status.toString());
				});


			});
			
		});
		
} // getDetails


window.createAuction = function(phrase ) {

	clear();
	try {
		let auctioneerHash = $('#auctioneerId').val();
		let totalTkts = $('#totakTickets').val();
		let tktPerPerson = $('#ticketsPerPerson').val();
		let validity = $('#endTimeInHours').val();
		let minAmt = $('#minBidAmt').val();

		if(!unlockaccount(auctioneerHash, phrase)) {
			return;
		}
		
		AuctionFactory.deployed().then(function(factoryInstance) {
			factoryInstance.createAuction( tktPerPerson, totalTkts, minAmt, validity,{gas:1500000,from:auctioneerHash}).then(function(contractId) {
				writeMsg("Auction created for "+ auctioneerId + " at address " + contractId);
			});
		});
	} catch (err) {
		writeMsg("Error creating auction "+ err, true, false);
	}
}

//for creating collapsing and hiding sections
