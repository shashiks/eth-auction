// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css"
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'
// Import our contract artifacts and turn them into usable abstractions.
import sigVerify from '../../build/contracts/SigVerify.json'

var SigVerify = contract(sigVerify);

$( document ).ready(function() {
   window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8080"));
   SigVerify.setProvider(web3.currentProvider);
   console.warn("webb3 connected SigVerify " + web3 );

});


window.verify = function() {
	let buyer = $('#verify_addr').val();
	
	SigVerify.deployed().then(function(instance) {

	    var msg = '0x8CbaC5e4d803bE2A3A5cd3DbE7174504c6DD0c1C';
	    var h = web3.sha3(msg);
	    var sig = web3.eth.sign(buyer, h).slice(2);
	    var r = `0x${sig.slice(0, 64)}`;
	    var s = `0x${sig.slice(64, 128)}`;
	    var v = web3.toDecimal(sig.slice(128, 130)) + 27;

		instance.verifySign.call(h, v, r, s).then(function(verifiedAddr) {			
			console.log('Verified address ' + verifiedAddr);
		});
	});
}
