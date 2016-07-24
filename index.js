module.exports = function(robot) {

    var request = require('request'),
    fs = require('fs'),
    api_url = 'https://btc-e.com/api/3/ticker/eth_usd-btc_usd';

    var config = JSON.parse(fs.readFileSync(process.env.SWAG_TRADE_CONFIG||'config.json'));

    robot.respond(/(money)/i, function(msg) {
        request(api_url, function (error, response, body) {
            if(!error && response.statusCode == 200) {

                var data = JSON.parse(body);
                var eth = data.eth_usd.sell
                var btc = data.btc_usd.sell
                var reply = 'ETH = $'+eth+'\n';
                reply += 'BTC = $'+btc+'\n';

                config.forEach(function(mofo) {
                    var win = 0;
                    mofo.transactions.forEach(function(transaction){
                        var now;
                        var init = transaction.amount*transaction.bought;
                        if(transaction.sold < 0){
                            if(transaction.type === 'eth'){
                                now = transaction.amount*eth;
                            }
                            else if(transaction.type === 'btc'){
                                now = transaction.amount*btc;
                            }
                        }
                        else{
                           now = transaction.amount*transaction.sold;
                        }

                        win += (now-init);
                    });
                    var round_win = Math.round((win)*100)/100;

                    if(round_win >= 0){
                        reply += mofo.name + ' : +$'+ round_win +'\n';
                    }
                    else{
                        reply += mofo.name + ' : -$'+ (-round_win) +'\n';
                    }
                });

                msg.send(reply);
            } else {
                msg.send(error);
            }
        });
    });
};
