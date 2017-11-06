pragma solidity ^0.4.11;

import '../contracts/Product.sol';


/**
* The usefullness of this is to be considered. As a new deployment is still required
* for the factory when <pre>Product</pre> changes. For now this is only a holder
* for each user and her Product as auction. Does not provide the immutability
* as the child object change will force changes to this factory
*/
contract ProductFactory {

	// This is dummy holder so that changes to Product are loaded along with factory
	// This number will match the migration number
	uint256 public version = 10;

	//restrict call to create produt later using this owner only
	address factoryOwner;

	// contains the owner of an auction mapped to the hash of that auction
	mapping( address => address) public products;

	function ProductFactory() {
		factoryOwner = msg.sender;
	}
	
    function createProduct(uint32 pTicketPerPerson, uint32 pTotalTickets, uint32 pMinimumBid, uint256 pEndTime ) returns (address auctionAddress) {
        
        address owner = msg.sender;
        products[owner] = new Product(owner, pTicketPerPerson, pTotalTickets, pMinimumBid, pEndTime); 
		return products[owner];
    
    }

    function getProduct(address owner) returns (address) {
        return products[owner];
    }

}

