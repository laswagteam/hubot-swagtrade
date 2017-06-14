const fs = require('fs');
const request = require('request');
const accounting = require('accounting');

const { SWAG_TRADE_CONFIG = 'config.json' } = process.env;
const API_URL = 'https://api.coinmarketcap.com/v1/ticker/';

function getExchangeRates() {
  return new Promise((resolve, reject) => {
    request(API_URL, (error, { statusCode }, body) => {
      if (error || statusCode !== 200) {
        throw error || new Error('Unknow error');
      }
      const allTheCoins = JSON.parse(body);
      const simplified = {};
      allTheCoins.forEach(coin => {
        simplified[coin.id] = {name: coin.symbol, price: parseFloat(coin.price_usd)};
      });
      resolve(simplified);
    });
  });
}

function howMuchDidTheMofosWin(prices) {
  const mofos = JSON.parse(fs.readFileSync(SWAG_TRADE_CONFIG));
  const mofosWinnings = [];
  const mofosNames = [];
  const currencyPrices = [];
  const reply = [];

  const currencies = {};

  mofos.forEach(({ name, transactions }) => {
    const balance = {usd: 0};
    transactions.forEach(transaction => {
      const { currency, type, volume, rate } = transaction;
      const factor = type === 'buy' ? 1 : -1;
      if(typeof balance[currency] === 'undefined'){
        balance[currency] = 0;
      }
      balance.usd = balance.usd + (-factor * volume * rate);
      balance[currency] = balance[currency] + (factor * volume * prices[currency].price);
      currencies[currency] = true;
    });

    const total = Math.round(
      Object.values(balance).reduce((a, b) => a + b, 0) * 100
    ) / 100;

    mofosWinnings.push(total);
    mofosNames.push(name);
  });
  const mofosWinningsFormatted = accounting.formatColumn(mofosWinnings, "$ ")
  const currenciesReply = [];

  Object.keys(currencies).forEach(currency => {
    currencyPrices.push(prices[currency].price);
  });

  const currencyPricesFormatted = accounting.formatColumn(currencyPrices, "$ ", 4);
  Object.keys(currencies).forEach((currency, i) => {
    currenciesReply.push(`${prices[currency].name} = ${currencyPricesFormatted[i]}`);
  });

  for(let i = 0; i < mofosNames.length; i++){
    reply.push(`${mofosNames[i]} : ${mofosWinningsFormatted[i]}`);
  }

  return '```'+currenciesReply.join('\n')+'\n---\n'+reply.join('\n')+'```';
}

module.exports = robot => {
  robot.respond(/(money)/i, (msg) => {
    return getExchangeRates()
      .then(howMuchDidTheMofosWin)
      .then(reply => msg.send(reply))
      .catch(error => msg.send(error));
  });
};
