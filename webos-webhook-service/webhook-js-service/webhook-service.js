var http = require('http');
var pkgInfo = require('./package.json');
var Service = require('webos-service');
var service = new Service(pkgInfo.name);

service.register('call', function(message) {
    try {
        var callbackUrl = message.payload.url;

        http.get(callbackUrl, function(res) {
            message.respond({
                returnValue: true,
                message: JSON.stringify(message.payload) + '. Resp: ' + res.statusCode
            });
        }).on('error', function(e) {
            message.respond({
                returnValue: false,
                errorText: JSON.stringify(e)
            });
        });
    } catch (e) {
        message.respond({
            returnValue: false,
            errorText: JSON.stringify(e)
        });
    }

});

service.register('ping', function(message) {
    message.respond({
        "returnValue": true
    });
});
