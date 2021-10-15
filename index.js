require('dotenv').config();
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const uWS = require('uWebSockets.js');
const port = 9001;
const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
const backpressure = 1024;

const decoder = new TextDecoder();
const web3 = createAlchemyWeb3(RPC_ENDPOINT);
const topics = [
  web3.eth.abi.encodeEventSignature('Transfer(address,address,uint256)'),
]
const app = uWS./*SSL*/App({
  key_file_name: 'misc/key.pem',
  cert_file_name: 'misc/cert.pem',
  passphrase: '1234'
}).ws('/', {
  open: (ws) => {
  },
  message: (ws, message, isBinary)=>{
    console.log(decoder.decode(message));
    // here, check that message is of a specific type
    let address = decoder.decode(message);
    // here, check that address is in database?
    if(address!=='undefined')
      ws.eth_subscription = web3.eth.subscribe('logs', {
        address,
        topics
      }).on("connected", (subscriptionId)=>{
        console.log(subscriptionId);
      }).on("data", (log)=>{
        let {from, to, amount} = web3.eth.abi.decodeLog([{
          type: 'address',
          name: 'from',
          indexed: true,
        },{
          type: 'address',
          name: 'to',
          indexed: true,
        },{
          type: 'uint256',
          name: 'amount'
        }], log.data, log.topics.slice(1,log.topics.length));
          ws.send(amount);
      });
  },
  drain: (ws)=>{
    console.log(ws.getBufferedAmount());
  },
  close: (ws)=>{
    console.log('closed');
    if(ws.eth_subscription)
      ws.eth_subscription.unsubscribe((error, success)=>{
        if(success)
          console.log('Successfully unsubscribed!');
      });
  }
}).get('/:msg', (res, req) => {
  res.end(req.getParameter(0));
}).listen(port, (token) => {
  if (token) {
    console.log('Listening to port ' + port);
  } else {
    console.log('Failed to listen to port ' + port);
  }
});