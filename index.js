"use strict"

const express = require("express"),
      app = express(),
	    WebSocket = require('ws'),
      http = require('http'),
      storage = require('node-persist'),
      cors = require("cors"),
      path = require('path'),
      bodyParser = require('body-parser'),
      yahooFinance = require('yahoo-finance'),
	    port = process.env.PORT || 5000;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
var CLIENTS=[];

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
storage.initSync();
app.use(express.static(path.join(__dirname, 'client/build')));

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log('someone connected ', message);
        CLIENTS.push(ws);
        let symbols = storage.getItemSync('codes');
        if(symbols && symbols.length) {
          const stocks = async () => {
            try {
              let [q, h] = await Promise.all([getQuotes(symbols), getHistorical(symbols)]);
              return [q, h];
            }catch(err) {
              throw err;
            }
          };
          
          stocks()
          .then((result) => {
            let historical = result[1];
            let quotes = result[0];
            let count = 0;
            let hisArr = [];
            let quoArr = [];
            for(let index = 0; index < symbols.length; index++) {
              let obj = { name: '', data: [] };
              obj.name = symbols[index];
              let series = historical[obj.name];
              for(let i = 0; i < series.length; i++) {
                let timestamp = new Date(series[i].date).getTime();
                let adjClose = parseFloat(series[i].adjClose);
                obj.data.push([timestamp, adjClose]);
              }
              hisArr.push(obj);
              quoArr.push({code:obj.name , summaryProfile:quotes[obj.name]['summaryProfile']})
              count ++;
              if(count === symbols.length) {
                let stockObj = {
                  historical: hisArr,
                  quotes: quoArr
                };
                sendAll(JSON.stringify(stockObj));
              }
            }
          })
          .catch((err) => {
            console.log('hello error ', err);
            ws.send(JSON.stringify({historical: [],quotes: []}));
          });
        }else {
          ws.send(JSON.stringify({historical: [],quotes: []}));
        }
    });
});

app.put('/stock', (req, res) => {
  let code = req.body.code.toUpperCase();
  const stocks = async () => {
    try {
      let h = await getQuotes([code]);
      return h;
    }catch(err) {
      throw err;
    }
  };
  stocks()
  .then((result) => {
    let codes = [];
    codes = storage.getItemSync('codes') ? storage.getItemSync('codes') : [];
    console.log('codes ', codes);
    let index = codes.indexOf(code);
    if(index === -1) {
      codes.push(code)
      storage.setItemSync('codes',codes);
    }else {
      codes.splice(index, 1);
      storage.setItemSync('codes',codes);
    }
    res.status(200).send(storage.getItemSync('codes'));
  })
  .catch((err) => {
    console.log('wtf ', err);
    res.status(404).json({"code":"Invalid Code"});
  });
});

function sendAll (stocks) {
  for (let i=0; i<CLIENTS.length; i++) {
      CLIENTS[i].send(stocks);
  }
}

function getQuotes(symbols) {
  return (
    yahooFinance.quote({
      symbols: symbols,
      from: getDate(1),
      to: getDate(0),
      modules: ['summaryProfile']
    })
    .then(function (quotes) {
      return quotes;
    })
  );
}

function getHistorical(symbols) {
  return (
    yahooFinance.historical({
      symbols: symbols,
      from: getDate(1),
      to: getDate(0)
    })
    .then(function (historical) {
      return historical;
    })
  );
}

function getDate(y) {
  var date = new Date();
  let year = date.getFullYear() - y;
  return year + '-' + isLessThanTen(date.getMonth()+1) + '-'+ isLessThanTen(date.getDate());
}

function isLessThanTen(value) {
  return value < 10 ? '0'+value : value;
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname+'/client/build/index.html'));
});

server.listen(port, _ => {
  console.log(`App is running on port ${port}`);
});