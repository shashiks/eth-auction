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
			writeMsg("Cannot unlock account " + error, true, false);
			return false;
		}
		return true;
}

window.verify = function() {
	let buyer = $('#verify_addr').val();
	
	web3.personal.unlockAccount( buyer, 'welcome123', 10);

	SigVerify.deployed().then(function(instance) {

		var msg = web3.sha3("Welcome to EY Lab");
		console.log('msg ' + msg);

		var sig = web3.eth.sign(buyer, msg);
		console.log(' sign ' + sig);

		var r = sig.substr(0,66);
		console.log( "values r " + r);

		var s = "0x" + sig.substr(66,64) ;
		console.log( "values s " + s);

		var v =  parseInt(sig.substr(130)) + 27;
		console.log( "values v " + v);

		instance.verifySign.call(msg, v, r, s).then(function(verifiedAddr) {			
			console.log('Verified address ' + verifiedAddr);
		});
	});
}
