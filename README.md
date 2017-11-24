# An Ethereum based Auction
This is a sample code showing different features and approach to creating an Auction using 
- Solidity
- Truffle
- JQuery
- Private Chain (or any other eth network, I have used private)
- Oraclize.it

Using the AuctionFactory you create an Auction . 
The auction instance is initiated with following params:
a. Maximum Tickets that can be sold for this auction
b. Max number of tickets per person identified by address (yes addresses are free but then this is a sample for now)
c. Min bid amount for any ticket
d. Expiry for this auction - currently this check is disabled

The factory also initializes an escrow contract (AuctionEscrow/ETktEscro) that would facilitate for payment of tickets
by the bidders and receipt of payment by the auctioneer.
There are two version of escrow implemented (no strategy available to say which to use for now).

AuctionEscrow:
This is a regular escrow where the steps to complete the ticket sale are as follows:
1. Buyer pays for the sum of tickets she has won during bidding. Amount cannot be more or less than the total
2. Buyer confirms receving the tickets.
3. Auctioneer can transfer the amounts of tickets to his account for tickets that have completed above two steps.
4. Auctioneer calls cleanup() on the escrow which will transfer any remaining money in the contract to the auctioneer and kill the contract. Validations ensure that there is never excess money other than the sum of all auctioned tickets. This is a cleanup act.

ETktEscrow:
This contract is different from above in that it uses oraclize.it to verify that the tickets have been received by the customer. Steps are as follows:
1. Buyer pays for the sum of tickets
2. Auctioneer calls releasePayment, this function inturn checks the status of ticket by calling an external url.
3. the payment transfer goes through if verified else fails.

Note: the external URL is actually not defined, I am just using the deiselprice sample URL from oraclize samples. So this is just to demo a possible feature rather than complete functionality.


All validations for above params are implemented and events raised to indicate errors.
 
On the UI side code for polling for the receipt till the transaction is commited in n blocks is taken from here:
https://ethereum.stackexchange.com/questions/1187/how-can-a-dapp-detect-a-fork-or-chain-reorganization-using-web3-js-or-additional

This is a work in progress, or I may stop working on this once I feel I have got engouh info. For now and I am no UI guy so the screens will look crappy.

This will cover all the basic features that one would need while building a simple dApp using ETH
