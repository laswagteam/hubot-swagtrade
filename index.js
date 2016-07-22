module.exports = function(robot) {

    var request = require('request'),
    fs = require('fs'),
    api_url = 'https://btc-e.com/api/3/ticker/eth_usd';

    var config = JSON.parse(fs.readFileSync(process.env.SWAG_TRADE_CONFIG||'config.json'));

    robot.respond(/(money)/i, function(msg) {
        request(api_url, function (error, response, body) {
            if(!error && response.statusCode == 200) {

                var data = JSON.parse(body);
                var value = data.eth_usd.sell
                var reply = '';

                config.forEach(function(mofo) {
                    var init = mofo.amount*mofo.value;
                    var now = mofo.amount*value;
                    var win = Math.round((now-init)*100)/100;
                    if(win >= 0){
                        reply += mofo.name + ' : +$'+ win +'\n';
                    }
                    else{
                        reply += mofo.name + ' : -$'+ (-win) +'\n';
                    }
                });

                msg.send(reply);
            } else {
                msg.send(error);
            }
        });
    });
};
