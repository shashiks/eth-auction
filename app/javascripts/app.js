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

var watching = 0; //start watching to events only once

$( document ).ready(function() {
   window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8080"));
   AuctionFactory.setProvider(web3.currentProvider);
   Auction.setProvider(web3.currentProvider);
   AuctionEscrow.setProvider(web3.currentProvider);
   console.warn("webb3 connected  " + web3 );

});


window.getPayable = function() {
	let buyer = $('#buyer').val();
	let auctioneerId = $('#auctioneerId').val();
	AuctionFactory.deployed().then(function(factInstance) {
		factInstance.getAuction.call(auctioneerId).then(function(id) {
			var auction = Auction.at(id);
			console.log('buyer' + buyer);
			console.log('auction ' + id);

			auction.getPayableBidsTotal.call(buyer, {from:buyer}).then(function(amt) {
				console.log("Amtount " + amt);
				$("#div_payable").html(amt+"");
			});
		});
	});
}


window.buyTicket = function() {
	let auctioneerId = $('#auctioneerId').val();
	let buyer = $('#buyer').val();
	var orderAmt = "";
	var divObj = document.getElementById("div_payable");
    if ( divObj ){
        if ( divObj.textContent ){ // FF
            orderAmt = divObj.textContent;
        } else {  // IE           
            orderAmt = divObj.innerText;
        } 
    }  
	console.log("buyers::: "+ buyer + " " + orderAmt); 

	AuctionFactory.deployed().then(function(factInstance) {
		factInstance.getAuction.call(auctioneerId).then(function(auctionId) {
			factInstance.getEscrow.call(auctionId).then(function(escId) {
				var pEscrow = AuctionEscrow.at(escId);

				web3.personal.unlockAccount( buyer, 'welcome123', 10);

				pEscrow.payForTickets.sendTransaction({from: buyer, value: orderAmt, gasLimit: 1400000, gasPrice: 2000000}).then(function(txnHash) {
					console.log('txnHas' + txnHash);
					awaitBlockConsensus(web3, txnHash, 3, 4000, 4, function(err, receipt) { 
						// console.log("Got result from block confirmation");
						if(receipt) {
							console.log("receipt blockHash " + receipt.blockHash);
							console.log("receipt blockNumber " + receipt.blockNumber);
							console.log("receipt transactionIndex " + receipt.transactionIndex);
							// console.log("receipt logs " + receipt.logs);
							// if(receipt.logs) {
							// 	for(var i=0; i< receipt.logs.length; i++) {
							// 		console.log("A log " + receipt.logs[i].toString);
							// 	}
							// }
							
						} else {
							console.log("err from poll " + err);
						}
					});
				});
			});

		});
	});
	
}


window.awaitBlockConsensus = function(txWeb3, txhash, blockCount, repeatInSeconds, numPollAttempts, callback) {
   // var txWeb3 = web3s[0];
   var startBlock = Number.MAX_SAFE_INTEGER;
   var interval;
   var stateEnum = { start: 1, mined: 2, awaited: 3, confirmed: 4, unconfirmed: 5 };
   var savedTxInfo;
   var attempts = 0;

   var pollState = stateEnum.start;

   var poll = function() {
     if (pollState === stateEnum.start) {
     	// console.log('poll State ' + pollState);
       txWeb3.eth.getTransaction(txhash, function(e, txInfo) {
         if (e || txInfo == null) {
           return; // XXX silently drop errors
         }
         if (txInfo.blockHash != null) {
           startBlock = txInfo.blockNumber;
           savedTxInfo = txInfo;
           // console.log("mined");
           pollState = stateEnum.mined;
         }
       });
     }
     else if (pollState == stateEnum.mined) {
     	// console.log('poll State ' + pollState);
         txWeb3.eth.getBlockNumber(function (e, blockNum) {
           if (e) {
             return; // XXX silently drop errors
           }
           // console.log("blockNum: ", blockNum);
           if (blockNum >= (blockCount + startBlock)) {
             pollState = stateEnum.awaited;
           }
         });
     }
    else if (pollState == stateEnum.awaited) {
    	// console.log('poll State ' + pollState);
         txWeb3.eth.getTransactionReceipt(txhash, function(e, receipt) {
           if (e || receipt == null) {
             return; // XXX silently drop errors.  TBD callback error?
           }
           // confirm we didn't run out of gas
           // XXX this is where we should be checking a plurality of nodes.  TBD
           clearInterval(interval);
           // console.log("Got recepit while polling " + receipt);
           if (receipt.gasUsed >= savedTxInfo.gas) {
             pollState = stateEnum.unconfirmed;
             callback(new Error("we ran out of gas, not confirmed!"), null);
           } else {
             pollState = stateEnum.confirmed;
             callback(null, receipt);
           }
       });
     } else {
       throw(new Error("We should never get here, illegal state: " + pollState));
     }

     attempts++;
     if (attempts > numPollAttempts) {
       clearInterval(interval);
       pollState = stateEnum.unconfirmed;
       callback(new Error("Timed out, not confirmed"), null);
     }
   };

   //poll for updates every XX ms
   interval = setInterval(poll, repeatInSeconds);
   poll();
 };


/**
 Bid for the user id entered in the bidder box and:
 1. start listening for events
 2. check for transation confirmation upto X blocks for Y seconds
*/
window.bid = function() {

	//clear old messages
	$('#msg').html("");
	let bidder = $('#bidder').val();
	let bidAmount = $('#bidAmount').val();
	let auctioneerId = $('#auctioneerId').val();
	
	// console.log("Bid details " + bidAmount + " " + bidder + " " + auctioneerId);

	//ask user to enter password
	web3.personal.unlockAccount( bidder, 'welcome123', 10);

	AuctionFactory.deployed().then(function(factInstance) {
		factInstance.getAuction.call(auctioneerId).then(function(itemId) {
			var bidAuction = Auction.at(itemId);
			// var blockNumber = 0;
			//register for all events of Auction

			var txnHash = bidAuction.bid.sendTransaction(bidAmount, {gas: 4000000, from:bidder}).then(function(txnHash) {
				
				//Magic Numbers : wait for 3 confirmations at 4000ms intervals for 4 repetitions
				//these three params should be configs. change to 12 confirmations eventually
				awaitBlockConsensus(web3, txnHash, 3, 4000, 4, function(err, receipt) { 
					// console.log("Got result from block confirmation");
					if(receipt) {
						console.log("receipt blockHash " + receipt.blockHash);
						console.log("receipt blockNumber " + receipt.blockNumber);
						console.log("receipt transactionIndex " + receipt.transactionIndex);
						// console.log("receipt logs " + receipt.logs);
						// if(receipt.logs) {
						// 	for(var i=0; i< receipt.logs.length; i++) {
						// 		console.log("A log " + receipt.logs[i].toString);
						// 	}
						// }
						
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
        	let prdBid = "<p>Bid received for Ticket Id " + result.args.pTicketId + " of amount " + result.args.bidAmount
        	+ " from address " + result.args.bidder;
        	console.log("Auction bid msg " + prdBid); 
        	$("#msg").append(prdBid);
        	// console.log("BidCreated bidder " + result.args.bidder);
        	// console.log("BidCreated Amt " +result.args.bidAmount.toString());
        	// console.log("BidCreated tkt id " + result.args.pTicketId.toString());
        	// console.log("BidCreated tkt id wasRemoved " + result.removed);
        	// console.log("Block number for bid event " + result.blockNumber.toString);
        }
        else
        	console.log(error);
    });

	var highEvent = bidAuction.HighestBid({fromBlock: 'latest', toBlock: 'latest', address : itemId});
    highEvent.watch(function(error, result){
        if(!error) {
        	let highBid = "<p>Highest bid received for Ticket Id " + result.args.pTicketId + " of amount " + result.args.bidAmount
        	+ " from address " + result.args.bidder;
        	console.log("high bid msg " + highBid); 
        	$("#msg").append(highBid);

        	// console.log("highEvent bidder " + result.args.bidder);
        	// console.log("highEvent Amt " +result.args.bidAmount.toString());
        	// console.log("highEvent bidder tkt " + result.args.pTicketId.toString());
        	// console.log("highEvent tkt id wasRemoved " + result.removed);
        }
        else
        	console.log(error);
    });

	var errEvent = bidAuction.BidError({fromBlock: 'latest', toBlock: 'latest', address : itemId});
    errEvent.watch(function(error, result){
        if(!error) {
			let errBid = "<p>Invalid Bid for Ticket Id " + result.args.pTicketId + " of amount " + result.args.bidAmount
        	+ " from address " + result.args.bidder + " Error code " +  result.args.errorCode.toString();
        	console.log("errBid bid msg " + errBid); 
        	$("#msg").append(errBid);
        	// console.log("errEvent bidder " + result.args.bidder);
        	// console.log("errEvent Amt " +result.args.bidAmount.toString());
        	// console.log("errEvent Err code " + result.args.errorCode.toString());
        	// console.log("errEvent tkt id wasRemoved " + result.removed);
        }
        else
        	console.log(error);
    });

    var tktEvent = bidAuction.TicketAlloted({fromBlock: 'latest', toBlock: 'latest', address : itemId});
    tktEvent.watch(function(error, result){
        if(!error) {
        	// console.log("tktEvent bidder " + result.args.bidder);
        	// console.log("tktEvent Amt " +result.args.bidAmount.toString());
        	// console.log("tktEvent tkt Id " + result.args.pTicketId.toString());
        	// console.log("tktEvent tkt id wasRemoved " + result.removed);
        }
        else
        	console.log(error);
    });


 } /// watch Events



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


window.createAuction = function( ) {
	//llokup values later from controls
	try {
		$("#div_auction_id").html( "Creating Auction ...");
		//$("#candidate").val("");
		let auctioneerHash = $('#auctioneerId').val();
		let totalTkts = $('#totakTickets').val();
		let tktPerPerson = $('#ticketsPerPerson').val();
		let validity = $('#endTimeInHours').val();
		let minAmt = $('#minBidAmt').val();
		web3.personal.unlockAccount( auctioneerHash, 'welcome123', 5);
		AuctionFactory.deployed().then(function(factoryInstance) {
			//get the params from UI
			factoryInstance.createAuction( tktPerPerson, totalTkts, minAmt, validity,{gas:1500000,from:auctioneerHash}).then(function(contractId) {
				$("#div_auction_id").html( contractId);
			});
		});
	} catch (err) {
		console.log(err);	
	}
}

//for creating collapsing and hiding sections
