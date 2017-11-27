pragma solidity ^0.4.11;

import './Auction.sol';
import "github.com/oraclize/ethereum-api/oraclizeAPI.sol";

/**
* Instance of this will be per auction
* It holds all the money during bidding of each auction
* and finally refunds the balances as applicable to the bidders
*/
contract ETktEscrow is usingOraclize{

    address private auctioneer;
    Auction private auction;

    uint public someValue;
    
    event newOraclizeQuery(string description);
    event newDieselPrice(uint price);
    
    event PaymentFailed(address buyer, uint256 price);
    event TicketPaid(address buyer, uint256 price);
    event TestPrice(uint256 price);
    
    modifier acutioneerOnly {
        if(msg.sender != auctioneer) revert();
        _;
    }
    
    /**
     * Each buyers payment status is stored here.
     * Once buyer confirms recieving ticket 
     * the funds are moved to auctioneer
    */
    mapping (address => Payment) private payments;
    
    mapping (bytes32 => address) private releaseRequests;
    
    struct Payment {
        uint256 amount;
        bool released;
        uint256 releaseDate;
    }
 
    function AuctionEscrow(address _actioneer, Auction _auction) public {
        auctioneer = _actioneer;
        auction = _auction;
    }

    /**
     * Called by the customer for him to recieve the tickets
     * 
     */
    function payForTickets() public payable {

        //check that auction has expired
        if(!auction.isActive()) {
            uint txnVal = msg.value;
            uint32 bidTotal = auction.getPayableBidsTotal(msg.sender);
            //accept payment for all tickets only
            if(bidTotal > 0 && bidTotal == txnVal) {
                Payment p = payments[msg.sender];
                if(!p.released) { //allow only once
                    payments[msg.sender] = Payment({amount: msg.value, released: false, releaseDate: 0});
                }
            } else {//dont accept money if total is less
                revert();
            }
        }
    }
    
    /**
     * If buyer has paid then value will be greater than 0
    */
    function hasPaid (address buyer) public constant returns (bool paymentStatus) {
        return !payments[buyer].released && payments[buyer].amount > 0 ;
    }
    
//  function isPaymentReleased (address buyer) public constant returns (bool releaseStatus) {
//      return payments[buyer].released && payments[buyer].amount == 0;
//  }
    

    /**
     * The public function which the auctioneer will call to move funds
     * to his account
     */
    function releasePayment(address buyer) public acutioneerOnly payable{
        
        //assume that this operation calls a ticket api which indicates the
        //status of e-Ticket recived by the customer
        // if (oraclize_getPrice("URL") > this.balance) {
        //     newOraclizeQuery("Oraclize query was NOT sent, please add some ETH to cover for the query fee");
        // } else {
            newOraclizeQuery("Oraclize query was sent, standing by for the answer..");
            bytes32 id = oraclize_query("URL", "xml(https://www.fueleconomy.gov/ws/rest/fuelprices).fuelPrices.diesel");
            releaseRequests[id] = buyer;
        // }

    }
    
    function completeReleasePayment( bytes32 reqId, string reqRes) private {
        //TODO: check if reqRes indicated ticket paid
        address buyer = releaseRequests[reqId];
        if(buyer == 0) {
            revert();
        }
        
        Payment p = payments[buyer];
        if((p.released) || p.amount == 0 )
            revert();
            
        bool sent = auctioneer.send(p.amount);
        if(sent) {
            TicketPaid(buyer, p.amount);
            //reset values
            p.amount = 0;
            p.released = true;
            p.releaseDate = now;
        } else {
            PaymentFailed(buyer, p.amount);
            revert();
        }
    }

    function __callback(bytes32 myid, string result, bytes proof) {
        if (msg.sender != oraclize_cbAddress()) throw;
        //for an original url the value of received ticket should b checked here
        completeReleasePayment(myid, result);
        
      }

}