module.exports = function(robot) {

    var request = require('request'),
    fs = require('fs'),
    api_url = 'https://btc-e.com/api/3/ticker/eth_usd-btc_usd';

    robot.respond(/(money)/i, function(msg) {
        var config = JSON.parse(fs.readFileSync(process.env.SWAG_TRADE_CONFIG||'config.json'));
        request(api_url, function (error, response, body) {
            if(!error && response.statusCode == 200) {

                var data = JSON.parse(body);

                const price = {
                    usd: 1,
                    eth: data.eth_usd.sell,
                    btc: data.btc_usd.sell,
                };

                let reply = 'ETH = $'+price.eth+'\n';
                reply += 'BTC = $'+price.eth+'\n';

                config.forEach(function(mofo) {
  
                  const balance = { usd : 0, btc: 0, eth: 0 };

                  mofo.transactions.forEach(function(transaction) {
                    const factor = transaction.type === 'buy' ? 1 : -1;
                    balance.usd = balance.usd + (-factor * transaction.volume * transaction.rate);
                    balance[transaction.currency] = balance[transaction.currency] + (factor * transaction.volume);
                  });
                  
                  let final_usd_balance = 0;
                  Object.keys(balance).forEach((currency) => {
                    final_usd_balance += balance[currency] * price[currency];
                  })

                  final_usd_balance = Math.round((final_usd_balance)*100)/100;

                  if(final_usd_balance >= 0){
                    reply += mofo.name + ' : +$'+ final_usd_balance +' :juppedealwithit:\n';
                  }
                  else{
                    reply += mofo.name + ' : -$'+ (-final_usd_balance) +' :nelson:\n';
                  }
                });

                msg.send(reply);
            } else {
                msg.send(error);
            }
        });
    });
};
