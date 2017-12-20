import { default as IpfsAPI } from 'ipfs-api';

var ipfs = IpfsAPI('localhost', '5001', {protocol: 'http'})




window.test = function () {
	console.log('sdfdsf');
}

  
  window.readImg = function() {

  let ticketHash = '';

  var divObj = document.getElementById("div_tkt_img_hash");
    if ( divObj ){
        if ( divObj.textContent ){ // FF
            ticketHash = divObj.textContent;
        } else {  // IE           
            ticketHash = divObj.innerText;
        } 
    }  
      ipfs.cat(ticketHash, (err, res) => {
        if (err){ 
          writeMsg("Error reading file content for hash " + err, true, true);
          return;
        }
        let data = ''
        res.on('data', (d) => {
          data = data + d
        })
        res.on('end', () => {
          console.log("Content from ipfs for hash :: " + ticketHash);
          console.log('img id is ' +document.getElementById("img_tkt_view"));
          let imgUrl = "http://localhost:8080/ipfs/" + ticketHash;
          document.getElementById("img_tkt_view").src = imgUrl;
          //$("#div_tkt_img_data").html(data);
          //$("#div_tkt_data").html(data);
        })
      })

    

  }

  window.writeImg  = function() {
    // event.stopPropagation()
    // event.preventDefault()
    // const file = event.target.files[0]
  
    const file = ticket_img.files[0];
    let reader = new window.FileReader()
    reader.onloadend = () => saveToIpfs(reader)
    reader.readAsArrayBuffer(file)
  }

  window.saveToIpfs = function(reader) {
    let ipfsId
    const buffer = Buffer.from(reader.result)
    ipfs.add(buffer, (err, res) => {
      if (err) {
        writeMsg("Error writing file hash for content " + err, true, true);
        return;
      } 
        const hash = res[0].hash
        writeMsg("img Content Id " + hash, false, false);
        $("#div_tkt_img_hash").html(hash.toString());
    })

    // ipfs.add(buffer, { progress: (prog) => console.log(`received: ${prog}`) })
    //   .then(function(response) {
        
    //     const hash = response[0].hash
    //     writeMsg("Image Content Id " + hash, false, false);
    //     $("#div_tkt_img_hash").html(hash.toString());
    //   }).catch((err) => {
    //     console.error(err)
    //   })
  }


  //functions to just write text to ipfs 

  window.writeFile = function() {
    clear();
	let ticketVal = $('#ticket_txt').val();
    console.log('Ticket is '+ ticketVal + ' ' + ipfs);
    
    //remove this
    $("#div_tkt_hash").html(ticketVal);

    ipfs.add([Buffer.from(ticketVal)], (err, res) => {
      if (err) {
      	writeMsg("Error writing file hash for content " + err, true, true);
      	return;
      } 
      	const hash = res[0].hash
		    writeMsg("Content Id " + hash, false, false);
		    $("#div_tkt_hash").html(hash.toString());
    })

  }

  window.readFile = function() {
    clear();
	let ticketHash = '';

	var divObj = document.getElementById("div_tkt_hash");
    if ( divObj ){
        if ( divObj.textContent ){ // FF
            ticketHash = divObj.textContent;
        } else {  // IE           
            ticketHash = divObj.innerText;
        } 
    }  
	console.log(" hash of content from div ::: " + ticketHash + ' ' + ipfs ); 

      ipfs.cat(ticketHash, (err, res) => {
        if (err){ 
    	  	writeMsg("Error reading file content for hash " + err, true, true);
	      	return;
        }
        let data = ''
        res.on('data', (d) => {
          data = data + d
        })
        res.on('end', () => {
          console.log("Content from ipfs for hash :: " + ticketHash  + " is " + data, false, false);
          $("#div_tkt_data").html(data);
        })
      })

  }
