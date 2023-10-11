const http = require('http');
const { EventEmitter } = require('stream');

console.log('CURR_HOST', process.env.CURR_HOST);

module.exports = class AnswerListener extends EventEmitter {

    constructor(port) {
        super();
        this.port = port;
        this.baseUrl = "http://" + process.env.CURR_HOST + ":" + port;

        const that = this;
        const server = http.createServer((req, res) => {
            const url = req.url;
            
            console.log('url: ', url);
            res.writeHead(200);
            res.end();
        
            const splitted = url.split('/');

            if (splitted.length >= 3) {
                const answer = {
                    dialogId: splitted[1],
                    buttonType: splitted[2],
                    button: decodeURIComponent(splitted[3])
                }
                that.emit(answer.dialogId, answer);
            }
        });

        server.listen(port);
        this.server = server;
        console.log('Answer server is started on port ', port);
    }

    generateUrl(dialogId, buttonType, button) {
        return this.baseUrl + "/" + dialogId + "/" + buttonType + "/" + encodeURIComponent(button);
    }
}