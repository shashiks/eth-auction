// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css"

var BigNumber = require('bignumber.js');

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'
// Import our contract artifacts and turn them into usable abstractions.
import productFactory from '../../build/contracts/ProductFactory.json'
import product from '../../build/contracts/Product.json'

var ProductFactory = contract(productFactory);
var Product = contract(product);

//get these from web3 later
var miner_ac = "0xf09564Ca641B9E3517dFc6f2e3525e7078eEa5A8"; // an address
var auctioneer = "0xE7D4fb00EA93027a10101A48F9b791626f232Ac6"; // another address
var bidder_1 = "0xd7f08d1f95c7b0F1Fa608CaD692d40A14305053e"; // another address
var bidder_2 = "0x3ad78130DCff93d6c942c37aA45F0A004A0Ffe0C"; // another address


// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.

$( document ).ready(function() {
   window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8080"));
   ProductFactory.setProvider(web3.currentProvider);
   Product.setProvider(web3.currentProvider);
   console.warn("webb3 connected  " + web3 );

});

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
           console.log("Got recepit while polling " + receipt);
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
	let auctioneerId = $('#auctioneerId').val();
	let bidder = $('#bidder').val();
	let bidAmount = $('#bidAmount').val();
	// console.log("Bid details " + bidAmount + " " + bidder + " " + auctioneerId);

	web3.personal.unlockAccount( bidder, 'welcome123', 10);

	ProductFactory.deployed().then(function(factInstance) {

		factInstance.getProduct.call(auctioneerId).then(function(itemId) {
			var bidProduct = Product.at(itemId);
			var blockNumber = 0;

			//register for all events of Auction
			watchEvents(bidProduct, itemId);


			var txnHash = bidProduct.bid.sendTransaction(bidAmount, {gas: 1400000, from:bidder}).then(function(txnHash) {
				// console.log('Txn hash ' + txnHash);
				
				//from: 3rd param:watch for 3 confirmations at 4000ms intervals for 4 repetitions
				//these three params should be configs
				awaitBlockConsensus(web3, txnHash, 3, 4000, 4, function(err, receipt) { 
					// console.log("Got result from block confirmation");
					if(receipt) {
						console.log("receipt blockHash " + receipt.blockHash);
						console.log("receipt blockNumber " + receipt.blockNumber);
						console.log("receipt transactionIndex " + receipt.transactionIndex);
						/*
						console.log("receipt logs " + receipt.logs);
						if(receipt.logs) {
							for(var i=0; i< receipt.logs.length; i++) {
								console.log("A log " + receipt.logs[i].toString);
							}
						}
						*/
					} else {
						console.log("err from poll " + err);
					}
				});
			});


			// var txnHash = Product.at(itemId).bid(87, {gas: 1400000, from: '0xf09564Ca641B9E3517dFc6f2e3525e7078eEa5A8'} );
			
		})
	});

}

window.watchEvents = function(bidProduct, itemId) {

	var bidEvent = bidProduct.BidCreated({fromBlock: 'latest', toBlock: 'latest', address : itemId});
    bidEvent.watch(function(error, result){
        if(!error) {
        	// console.log("BidCreated bidder " + result.args.bidder);
        	// console.log("BidCreated Amt " +result.args.bidAmount.toString());
        	// console.log("BidCreated tkt id " + result.args.pTicketId.toString());
        	// console.log("BidCreated tkt id wasRemoved " + result.removed);
        	// console.log("Block number for bid event " + result.blockNumber.toString);
        	
        }
        else
        	console.log(error);
    });

	var highEvent = bidProduct.HighestBid({fromBlock: 'latest', toBlock: 'latest', address : itemId});
    highEvent.watch(function(error, result){
        if(!error) {
        	// console.log("highEvent bidder " + result.args.bidder);
        	// console.log("highEvent Amt " +result.args.bidAmount.toString());
        	// console.log("highEvent bidder tkt " + result.args.pTicketId.toString());
        	// console.log("highEvent tkt id wasRemoved " + result.removed);
        }
        else
        	console.log(error);
    });

	var errEvent = bidProduct.BidError({fromBlock: 'latest', toBlock: 'latest', address : itemId});
    errEvent.watch(function(error, result){
        if(!error) {
        	// console.log("errEvent bidder " + result.args.bidder);
        	// console.log("errEvent Amt " +result.args.bidAmount.toString());
        	// console.log("errEvent Err code " + result.args.errorCode.toString());
        	// console.log("errEvent tkt id wasRemoved " + result.removed);
        }
        else
        	console.log(error);
    });

    var tktEvent = bidProduct.TicketAlloted({fromBlock: 'latest', toBlock: 'latest', address : itemId});
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


 }
/*
* Get the details of auction for current user
*/
window.getAuctionDetails = function() {
		let auctioneerId = $('#auctioneerId').val();
		
		ProductFactory.deployed().then(function(factoryInstance) {
			factoryInstance.getProduct.call(auctioneerId).then(function(result) {
				// console.warn("address of auction for  " + auctioneerId + " is " + result);
				$("#div_auction_id").html(result);
				var myAuction = Product.at(result);

				myAuction.balanceTikets.call().then(function(bal) {
					console.log("balance ticket" + bal);
					$("#div_tkt_balance").html(bal+"");
				});

				//try to get some values from the auction
				myAuction.auctioneer.call().then(function(auctioneerAddress) {
					$("#div_owner_id").html(auctioneerAddress);
					
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
		
} // getContractAddress


window.createAuction = function( ) {
	//llokup values later from controls
	try {
		$("#div_auction_id").html( "Creating Auction ...");
		//$("#candidate").val("");
		let auctioneerHash = $('#auctioneerId').val();
		web3.personal.unlockAccount( auctioneerHash, 'welcome123', 5);
		ProductFactory.deployed().then(function(factoryInstance) {
			// console.log("Req  " + auctioneerHash);
			// console.log("Fact " + factoryInstance.address);
			//get the params from UI
			factoryInstance.createProduct( 2, 6, 1, 1,{gas:1500000,from:auctioneerHash}).then(function(contractId) {
				// console.warn("Product Auction created at " + contractId);
				$("#div_auction_id").html( contractId);
			});
		});
	} catch (err) {
		console.log(err);	
	}
}

