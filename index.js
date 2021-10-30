const fs = require('fs');
const request = require('request');
const accounting = require('accounting');

const { SWAG_TRADE_CONFIG = 'config.json' } = process.env;
const API_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';

function rightPad(string, length = 3, char = ' ') {
  const padLength = Math.max(0, length - string.length);
  return `${string}${char.repeat(padLength)}`;
}

function getExchangeRates() {
  return new Promise((resolve, reject) => {
    request(API_URL, {headers: {'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY}}, (error, { statusCode }, body) => {
      if (error || statusCode !== 200) {
        throw error || new Error('Unknow error');
      }
      const allTheCoins = JSON.parse(body);
      const simplified = {};
      allTheCoins.data.forEach(coin => {
        simplified[coin.slug] = {
          name: coin.symbol,
          price: parseFloat(coin.quote.USD.price),
        };
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
    const balance = { usd: 0 };
    transactions.forEach(transaction => {
      const { currency, type, volume, rate } = transaction;
      const factor = type === 'buy' ? 1 : -1;
      if (typeof balance[currency] === 'undefined') {
        balance[currency] = 0;
      }
      balance.usd = balance.usd + -factor * volume * rate;
      const price = prices[currency] ? prices[currency].price : 0;
      balance[currency] = balance[currency] + factor * volume * price;
      currencies[currency] = true;
    });

    const total =
      Math.round(Object.values(balance).reduce((a, b) => a + b, 0) * 100) / 100;

    mofosWinnings.push(total);
    mofosNames.push(name);
  });
  const mofosWinningsFormatted = accounting.formatColumn(mofosWinnings, '$ ');
  const currenciesReply = [];

  Object.keys(currencies).forEach(currency => {
    const price = prices[currency] ? prices[currency].price : 0;
    currencyPrices.push(price);
  });

  const currencyPricesFormatted = accounting.formatColumn(
    currencyPrices,
    '$ ',
    4,
  );
  Object.keys(currencies).forEach((currency, i) => {
    const priceLine = prices[currency]
      ? `${rightPad(prices[currency].name)} = ${currencyPricesFormatted[i]}`
      : `${rightPad(currency)} is such a shitcoin it doesn't even have a price`;
    currenciesReply.push(priceLine);
  });

  for (let i = 0; i < mofosNames.length; i++) {
    reply.push(`${mofosNames[i]} : ${mofosWinningsFormatted[i]}`);
  }

  return (
    '```' + currenciesReply.join('\n') + '\n---\n' + reply.join('\n') + '```'
  );
}

function howMuchDidTheMofosOwn(prices) {
  const mofos = JSON.parse(fs.readFileSync(SWAG_TRADE_CONFIG));

  const output = mofos.map(({ name, transactions }) => {
    const balance = transactions.reduce((memo, transaction) => {
      const { currency, type, volume, rate } = transaction;
      const factor = type === 'buy' ? 1 : -1;
      memo[currency] = (memo[currency] || 0) + factor * volume;
      return memo;
    }, {});

    const totalUSDBalance = Object.entries(balance).reduce(
      (total, [currency, vol]) => {
        if (prices[currency]) return total + (vol * prices[currency].price);
        return total;
      }, 0
    );

    const formattedAmounts = accounting.formatColumn(
      Object.values(balance),
      '',
      8,
    );
    const lines = Object.keys(balance).map(
      (currency, i) => {
        return `  ${rightPad(currency)}: ${formattedAmounts[i].replace(
          /\.?0+$/,
          '',
        )}`;
      }
        
    );
    return `${name}:\n${lines.join('\n')}\n  -------\n  Current USD value : ${accounting.formatMoney(totalUSDBalance)}`;
  });

  return '```' + output.join('\n\n') + '```';
}

module.exports = robot => {
  robot.respond(/(money)/i, msg => {
    return getExchangeRates()
      .then(howMuchDidTheMofosWin)
      .then(reply => msg.send(reply))
      .catch(error => msg.send(error.message));
  });

  robot.respond(/(balances)/i, msg => {
    let message;
    try {
      message = howMuchDidTheMofosOwn();
    } catch(err) {
      message = err.message;
    }
    return msg.send(message);
  });
};
