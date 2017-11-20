# An Ethereum based Auction
This is a sample code showing different features and approach to creating an Auction using 
- Solidity
- Truffle
- JQuery
- Private Chain (or any other eth network, I have used private)

Using the ProductFactory you can create an auction of Product. 
The product instance is initiated with following params:
a. Maximum Tickets that can be sold for this auction
b. Max number of tickets per person identified by address (yes addresses are free but then this is a sample for now)
c. Min bid amount for any ticket
d. Expiry for this auction - currently this check is disabled

Validations for above params are implemented and events raised to indicate errors.
 
Code for polling for the receipt till the transaction is commited in n blocks is taken from here:
https://ethereum.stackexchange.com/questions/1187/how-can-a-dapp-detect-a-fork-or-chain-reorganization-using-web3-js-or-additional

This is a work in progress, or I may stop working on this once I feel I have got engouh info. For now and I am no UI guy so the screens will look crappy.

This will cover all the basic features that one would need while building a simple dApp using ETH