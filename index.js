/*
* Primary file for API
*
*/

//Dependencies
const http = require('http'),
  https = require('https'),
  url = require('url'),
  StringDecoder = require('string_decoder').StringDecoder,
  fs = require('fs'),
  cluster = require('cluster'),
  os = require('os'),
  config = require('./config');

// Instantiating the http server
const httpServer = http.createServer((req,res) => {
  unifiedServer(req, res);
})

// Instantiating the https server
const httpsServerOptions = {
  'key' : fs.readFileSync('./https/key.pem'),
  'cert' : fs.readFileSync('./https/cert.pem')
}
const httpsServer = https.createServer(httpsServerOptions, (req,res) => {
  unifiedServer(req, res);
})

// all the server logic for both the http and https server
const unifiedServer = (req,res) => {
    // Get the URL and parse it
    const parsedUrl = url.parse(req.url, true); 
  
    // Get the path
    const path = parsedUrl.pathname,
      trimmedPath = path.replace(/^\/+|\/+$/g,'');
    
  
    // Get the query string as an object
    const queryStringObject = parsedUrl.query;
    
    
    // Get the HTTP Method
    const method = req.method.toLowerCase();
    
    // Get the header as an object
    const headers = req.headers;
    
  
    // Get the payload if any
    const decoder = new StringDecoder('utf-8');
    let buffer = "";
    req.on('data', (data) => {
      buffer += decoder.write(data);
    })
    req.on('end', () => {
      buffer += decoder.end();
      
      // choose the handler this request should go to
      const chosenHandler = typeof(router[trimmedPath]) != 'undefined' ? router[trimmedPath] : handlers.notFound; 
      
      var data = {
        trimmedPath,
        queryStringObject,
        method,
        headers,
        'payload' : buffer
      };
  
      // Route the request to the specified handler
      chosenHandler(data, function(statusCode, payload){
        // use the status code calledback or default to 200
        statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
  
        // use the payload called back or default to empty
        payload = typeof(payload) == 'object' ? payload : {};
  
        // convert payload to a string
        var payloadString = JSON.stringify(payload);
  
        // Return the response
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(statusCode);
        res.end(payloadString);
  
      //Log the request path
      console.log('Returning this response ', statusCode, payloadString);
      })
    
    })
}
//Define handlers
const handlers = {}
  
  //hello handler
  handlers.hello = (data, callback) => {
    // Callback a http status code, and payload object
    callback(200, { 'msg' : 'welcome to our world' });
  };
  //no found handler
  handlers.notFound = (data, callback) => {
    callback(404);
  };

// Define a request router
const router = {
  'hello' : handlers.hello
};

if(cluster.isMaster){
  // Create the number of processes to match the number of cores on the cpu
  for(var i = 0; i < os.cpus().length; i++){
    cluster.fork();
  }
  // start the server
  // httpServer.listen(config.httpPort, () => {
  //   console.log('The server is listening on port ' + config.httpPort)
  // });

  // // start the server
  // httpsServer.listen(config.httpsPort, () => {
  //   console.log('The server is listening on port ' + config.httpsPort)
  // });
} else {
  // start the server
  httpServer.listen(config.httpPort, () => {
    console.log('The server is listening on port ' + config.httpPort)
  });

  // start the server
  httpsServer.listen(config.httpsPort, () => {
    console.log('The server is listening on port ' + config.httpsPort)
  });
}
