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


window.clearAuction  = function(phrase) {

	let auctioneerId = $('#auctioneerId').val();
	
	// console.log("Bid details " + bidAmount + " " + bidder + " " + auctioneerId);
	if(!unlockaccount(auctioneerId, phrase)) {
		return;
	}

	AuctionFactory.deployed().then(function(factInstance) {
		factInstance.getAuction.call(auctioneerId).then(function(auctionId) {
			factInstance.getEscrow.call(auctionId).then(function(escId) {
				var pEscrow = AuctionEscrow.at(escId);
				
				pEscrow.SelfDestructError().watch ( (err, response) => {  //set up listener for the AuctionClosed Event
			        //once the event has been detected, take actions as desired
			        $("#msg").html('Err removing Auction : ' + response.args.evtMsg );
      			});


				pEscrow.cleanup.sendTransaction( {from: auctioneerId, gasLimit: 1400000, gasPrice: 2000000}).then(function(txnHash) {
					console.log('txnHash : ' + txnHash);
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

window.releaseFunds = function(phrase) {

	let auctioneerId = $('#auctioneerId').val();
	let buyer = $('#tktReceiptId').val();
	
	console.log(" details " +  buyer + " " + auctioneerId);
	if(!unlockaccount(auctioneerId, phrase)) {
		return;
	}

	AuctionFactory.deployed().then(function(factInstance) {
		factInstance.getAuction.call(auctioneerId).then(function(auctionId) {
			factInstance.getEscrow.call(auctionId).then(function(escId) {
				var pEscrow = AuctionEscrow.at(escId);
				
				pEscrow.PaymentRelease().watch ( (err, response) => {  
			        //once the event has been detected, take actions as desired
			        $("#msg").html('Funds of tickets for buyer : ' + response.args.buyer + " released to auctioneer " + auctioneerId);
      			});

				pEscrow.PaymentReleaseFail().watch ( (err, response) => {  
			        //once the event has been detected, take actions as desired
			        $("#msg").html('Relase Funds failed of tickets for buyer : ' + response.args.buyer + " with total price " + response.args.price);
      			});

				pEscrow.releasePayment.sendTransaction(buyer, {from: auctioneerId, gas: 400000}).then(function(txnHash) {
					console.log('txnHash : ' + txnHash);
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



window.watchTkt = function(escrow, id) {

	console.log("Watching tkt " + escrow + " esc id " + id)
	var event = escrow.TicketReceipt({fromBlock: 'latest', toBlock: 'latest', address : id});
    event.watch(function(error, result){
        if(!error) {


        	// let prdBid = "<p>Bid received for Ticket Id " + result.args.pTicketId + " of amount " + result.args.bidAmount
        	// + " from address " + result.args.bidder;
        	// console.log("Auction bid msg " + prdBid); 
        	// $("#msg").append(prdBid);
        	console.log("e tkt event " + result.args.buyer);
        	console.log("e tkt event " + result.removed);
        	console.log("e tkt event " + result.blockNumber.toString);
        }
        else
        	console.log("tkt event err " + error);
    });

}

window.confirmTktReceipt = function(phrase) {

	let auctioneerId = $('#auctioneerId').val();
	let buyer = $('#tktReceiptId').val();
	
	console.log("confirmTktReceipt details " + buyer + " " + auctioneerId);
	if(!unlockaccount(buyer, phrase)) {
		return;
	}

	AuctionFactory.deployed().then(function(factInstance) {
		factInstance.getAuction.call(auctioneerId).then(function(auctionId) {
			factInstance.getEscrow.call(auctionId).then(function(escId) {
				var pEscrow = AuctionEscrow.at(escId);
				console.log(" conftkt auctionId " + auctionId + " esc id :: " + escId);
				
				watchTkt(pEscrow, escId);

				pEscrow.recordTicketReceipt.sendTransaction({from: buyer, gas: 4000000}).then(function(txnHash) {
					console.log(' recordTicketReceipt txnHash : ' + txnHash);
					awaitBlockConsensus(web3, txnHash, 2, 4000, 4, function(err, receipt) { 
						// console.log("Got result from block confirmation");
						if(receipt) {
							console.log("recordTicketReceipt receipt blockHash " + receipt.blockHash);
							console.log("recordTicketReceipt receipt blockNumber " + receipt.blockNumber);
							console.log("recordTicketReceipt receipt transactionIndex " + receipt.transactionIndex);
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


window.watchPurchase = function(escrow, id) {

	console.log("Watching purchase tkt " + escrow + " esc id " + id)
	var tPaidEvent = escrow.TicketPaid({fromBlock: 'latest', toBlock: 'latest', address : id});
    tPaidEvent.watch(function(error, result){
        if(!error) {


        	// let prdBid = "<p>Bid received for Ticket Id " + result.args.pTicketId + " of amount " + result.args.bidAmount
        	// + " from address " + result.args.bidder;
        	// console.log("Auction bid msg " + prdBid); 
        	// $("#msg").append(prdBid);
        	console.log("pur tkt recpt " + result.args.buyer);
        	console.log("pur tkt recpt " + result.args.price);
        	console.log("pur tkt recpt " + result.removed);
        	console.log("pur tkt recpt " + result.blockNumber.toString);
        }
        else
        	console.log("pur tkt event err " + error);
    });
}

window.buyTicket = function(phrase) {
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
	console.log("buyer ::: "+ buyer + " amt " + orderAmt); 
	// if(!unlockaccount(buyer, phrase)) {
	// 	return;
	// }

	web3.personal.unlockAccount(buyer, 'welcome123', 15);

	AuctionFactory.deployed().then(function(factInstance) {
		factInstance.getAuction.call(auctioneerId).then(function(auctionId) {
			factInstance.getEscrow.call(auctionId).then(function(escId) {
				var pEscrow = AuctionEscrow.at(escId);

				watchPurchase(pEscrow, escId);

				pEscrow.hasPaid.call(buyer).then(function(status) {
					console.log("Buyer " + buyer + " hasPaid " + status);
				});

				pEscrow.payForTickets.sendTransaction({from: buyer, value: orderAmt, gas: 4000000}).then(function(buytxnHash) {
					console.log('buyTicket txnHash : ' + buytxnHash);
					awaitBlockConsensus(web3, buytxnHash, 2, 2000, 4, function(err, receipt) { 
						// console.log("Got result from block confirmation");
						if(receipt) {
							console.log("buyTicket receipt blockHash " + receipt.blockHash);
							console.log("buyTicket receipt blockNumber " + receipt.blockNumber);
							console.log("buyTicket receipt transactionIndex " + receipt.transactionIndex);
							// console.log("receipt logs " + receipt.logs);
							// if(receipt.logs) {
							// 	for(var i=0; i< receipt.logs.length; i++) {
							// 		console.log("A log " + receipt.logs[i].toString);
							// 	}
							// }
							
						} else {
							console.log("buyTicket err from poll " + err);
						}
					});
				});
			});

		});
	});
	
}


/**
 Bid for the user id entered in the bidder box and:
 1. start listening for events
 2. check for transation confirmation upto X blocks for Y seconds
*/
window.bid = function(phrase) {

	//clear old messages
	$('#msg').html("");
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
        	let prdBid = "<p>Bid received for Ticket Id " + result.args.pTicketId + " of amount " + result.args.bidAmount
        	+ " from address " + result.args.bidder;
        	console.log("Auction bid msg " + prdBid); 
        	$("#msg").append(prdBid);
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
        }
        else
        	console.log(error);
    });

	var errEvent = bidAuction.BidError({fromBlock: 'latest', toBlock: 'latest', address : itemId});
    errEvent.watch(function(error, result){
        if(!error) {
			let errBid = "<p><font color='red'>Invalid Bid for Ticket Id " + result.args.pTicketId + " of amount " + result.args.bidAmount
        	+ " from address " + result.args.bidder + " Error:  " +  getErrMsg(result.args.errorCode.toString()) + "</font></p>";
        	console.log("errBid bid msg " + errBid); 
        	$("#msg").html(errBid);
        }
        else
        	console.log(error);
    });

    var tktEvent = bidAuction.TicketAlloted({fromBlock: 'latest', toBlock: 'latest', address : itemId});
    tktEvent.watch(function(error, result){
        if(!error) {
			let tktBid = "<p>Ticket Id " + result.args.pTicketId + " alloted to " + result.args.bidder
        	+ " for amount " + result.args.bidAmount ;
        	console.log("tkt alloted msg " + tktBid); 
        	$("#msg").append(tktBid);

        }
        else
        	console.log(error);
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


window.getAuth = function(nextFunc) {

	$("#nextfunc").val(nextFunc);
	$("#slideout").animate({left: "0px" }, {queue: false, duration: 500}).addClass("popped");
    $(".overlay").fadeIn(500);
	
}

window.doAuthFunc = function() {

		let confSig = $("#passphrase").val();
		let f = $("#nextfunc").val();
		
		$("#slideout").animate({left:'-500px'}, {queue: false, duration: 500}).removeClass("popped");
        $(".overlay").fadeOut(500);
		//clear val
		$("#passphrase").val('');
		window[f](confSig);

}

window.unlockaccount = function(id, phrase) {
		
		try {
			web3.personal.unlockAccount(id, phrase, 5);
		} catch(error) {
			
			let err = "<p><font color='red'>" + error +"</font></p>";
        	console.log('eer  ' + error);
        	$("#msg").html(err);
			return false;
		}
		return true;
}



window.createAuction = function(phrase ) {

	$("#msg").text('');
	//llokup values later from controls
	try {
		
		//$("#candidate").val("");
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
				$("#div_auction_id").html( contractId);
			});
		});
	} catch (err) {
		console.log(err);	
	}
}

//for creating collapsing and hiding sections
