const fs = require('fs');
const request = require('request');

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
        simplified[coin.id] = {name: coin.name, price: parseFloat(coin.price_usd)};
      });
      resolve(simplified);
    });
  });
}

function howMuchDidTheMofosWin(prices) {
  const mofos = JSON.parse(fs.readFileSync(SWAG_TRADE_CONFIG));
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

    if (total >= 0) {
      reply.push(`> ${name} : +${total} :juppedealwithit:`);
    } else {
      reply.push(`> ${name} : -${-total} :nelson:`);
    }
  });

  const currenciesReply = [];

  Object.keys(currencies).forEach(currency => {
    currenciesReply.push(`> ${prices[currency].name} = ${prices[currency].price}`);
  });

  return currenciesReply.join('\n')+'\n'+reply.join('\n');
}


module.exports = robot => {
  robot.respond(/(money)/i, (msg) => {
    return getExchangeRates()
      .then(howMuchDidTheMofosWin)
      .then(reply => msg.send(reply))
      .catch(error => msg.send(error));
  });
};
