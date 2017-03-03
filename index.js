const fs = require('fs');
const request = require('request');

const { SWAG_TRADE_CONFIG = 'config.json' } = process.env;
const API_URL = 'https://btc-e.com/api/3/ticker/eth_usd-btc_usd';

function getExchangeRates() {
  return new Promise((resolve, reject) => {
    request(API_URL, (error, { statusCode }, body) => {
      if (error || statusCode !== 200) {
        throw error || new Error('Unknow error');
      }

      const { eth_usd, btc_usd } = JSON.parse(body);
      resolve({
        usd: 1,
        eth: eth_usd.sell,
        btc: btc_usd.sell,
      });
    });
  });
}

function howMuchDidTheMofosWin(price) {
  const mofos = JSON.parse(fs.readFileSync(SWAG_TRADE_CONFIG));
  const { eth, btc } = price;
  const reply = [
    `> ETH = ${eth}`,
    `> BTC = ${btc}`,
  ];

  mofos.forEach(({ name, transactions }) => {
    const balance = { usd : 0, btc: 0, eth: 0 };

    transactions.forEach(transaction => {
      const { currency, type, volume, rate } = transaction;
      const factor = type === 'buy' ? 1 : -1;
      balance.usd = balance.usd + (-factor * volume * rate);
      balance[currency] = balance[currency] + (factor * volume * price[currency]);
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

  return reply.join('\n');
}


module.exports = robot => {
  robot.respond(/(money)/i, (msg) => {
    return getExchangeRates()
      .then(howMuchDidTheMofosWin)
      .then(msg.send)
      .catch(msg.send);
  });
};
