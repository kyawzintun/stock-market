import React, { Component } from 'react';
import axios from 'axios';
import ReactHighstock from 'react-highcharts/ReactHighstock';
import logo from './logo.svg';
import './App.css';
import 'bootstrap/dist/css/bootstrap.css'

const HOST = window.location.origin.replace(/^http/, 'ws')
const ws = new WebSocket(HOST);

function connetWebSocket(cb) {
  console.log('hello hello');
  ws.onopen = function () {
    console.log('websocket connected');
    ws.send('Hello from the react app');
  }
  ws.onmessage = function (ev) {
    cb(null, ev.data)
  }
} 

class App extends Component {
  constructor() {
    super();
    this.state = {
      data : {
          rangeSelector: {
          selected: 4
        },
        title: {
          text: 'STOCKS'
        },
        series: []
      },
      quotes: null,
      error: null,
      loading: true,
      stockCode: ''
    };

    this.addStock = this.addStock.bind(this);
    this.removeStock = this.removeStock.bind(this);
    this.changeHandler = this.changeHandler.bind(this);
  }


  componentDidMount() {
    connetWebSocket((err, data) => {
      const res = JSON.parse(data);
      console.log('res ', res);
      const series = [];
      if(res.historical.length) {
        res.historical.forEach(d => {
          series.push(d);
        })
      }
      this.setState({ loading: false, quotes: res.quotes });
      this.setState({...this.state, data: {
        ...this.state.data,
        series
      }});
    });
  }

  changeHandler(e) {
    this.setState({ stockCode: e.target.value, error: false });
  }

  addStock() {
    let obj = {code:this.state.stockCode};
    this.callApi(obj)
  }

  removeStock(code) {
    this.callApi({"code": code});
  }

  callApi(code) {
    if(code.code) {
      axios({
        method: 'put',
        url: 'stock',
        data: code
      })
      .then((res)=> {
        console.log(res.data);
        this.setState({ stockCode: '', error: false });
        ws.send('Hello from the react app');
        this.componentDidMount();
      })
      .catch((err)=> {
        console.log(err.response);
        if(err.response.status === 404) {
          this.setState({ error: 'Invalid Code' })
        }
      });
    }
  }
  
  handleString(longStr) {
    if(longStr.hasOwnProperty('summaryProfile')){
      if(longStr.summaryProfile.hasOwnProperty('longBusinessSummary')){
        return longStr.summaryProfile.longBusinessSummary.substring(0, 72) + '...';
      }
    }
    return null;
  }

  render() {
    let quotes;
    if(!this.state.loading) {
      quotes = this.state.quotes.map((q, index) => {
        return (
          <div className="col-md-4" key={index}>
            <div className="panel panel-default">
              <div className="panel-heading">
                {q.code}
                <button type="button" className="close" onClick={() =>this.removeStock(q.code)}>×</button>
              </div>
              <div className="panel-body">
                <p>{this.handleString(q)}</p>
              </div>
            </div>
          </div>
        );
      })
    } else {
      quotes = <p className="loading-txt">Loading...</p>
    }
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">REAL TIME STOCK MARKET</h1>
        </header>
        <main className="App-intro">
          <div className="container">
            <div>
              { !this.state.loading &&
                <ReactHighstock config={this.state.data} domProps={{id: 'chartId'} }></ReactHighstock>
              }
            </div>
            <div className="row panel-wrapper">              
              {quotes}
              
              { !this.state.loading &&
                <div className="col-md-4">
                  <div className="panel panel-default code-panel">
                    <div className="panel-body">
                      <p>Syncs in realtime across clients</p>
                      <div className="input-group">
                        <input type="text" className="form-control stock-input" placeholder="Stock code" value={this.state.stockCode} onChange={this.changeHandler} />
                        <button className="btn btn-success input-group-addon" id="add-stock-code" onClick={this.addStock}>Add</button>
                      </div>
                      { this.state.error &&
                        <p className="invalid-code">Invalid Code</p>
                      }
                    </div>
                  </div>
                </div>
              }

            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default App;
