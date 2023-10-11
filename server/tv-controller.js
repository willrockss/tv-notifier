const { EventEmitter } = require('stream');
const { error } = require('console');
const LGTV = require('lgtv2');
const AnswerListener = require('./answers-listener');


const WEBOS_URI_PLAY = 'ssap://media.controls/play'; // params: -
const WEBOS_URI_PAUSE = 'ssap://media.controls/pause'; // params: -
const WEBOS_URI_STOP = 'ssap://media.controls/stop'; // params: -
const WEBOS_URI_REWIND = 'ssap://media.controls/rewind'; // params: -

const WEBOS_URI_FAST_FORWARD = 'ssap://media.controls/fastForward'; // params: -
const WEBOS_URI_CREATE_TOAST = 'ssap://system.notifications/createToast'; // params: message, iconData, iconExtension, onClick[appId, params]
const WEBOS_URI_CLOSE_TOAST = 'ssap://system.notifications/closeToast'; // params: toastId
const WEBOS_URI_CREATE_ALERT = 'ssap://system.notifications/createAlert'; // params: title, message, modal, buttons, onclose[uri, params], type,isSysReq || buttons - label, focus, buttonType, onClick [luna uri], params
const WEBOS_URI_CLOSE_ALERT = 'ssap://system.notifications/closeAlert'; // params: alertId

const WEBOS_URI_SYSTEM_INFO = 'ssap://system/getSystemInfo';
const WEBOS_URI_SW_INFO = 'ssap://com.webos.service.update/getCurrentSWInformation';

const WEBOS_URI_LIST_APPS = 'ssap://com.webos.applicationManager/listApps';


const DEFAULT_ALERT_DIALOG_TIMEOUT_MILLIS = 55_000;

LGTV.prototype.requestAsPromise = function(url, params) {
    return new Promise((resolve, reject) => {
        this.request(url, params, function(err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res)
            }
        });
    });
}

module.exports = class TvController extends EventEmitter {

    constructor(uri) {
        super();
        this.uri = uri;
        this.isConnected = false;
        this.isConnecting = false;
        this.client = null;
        this.disconnectionTimerId = null;

        this.answerListener = new AnswerListener(8000);
    }

    async connect() {
        if (this.isConnected) {
            return;
        }
        console.log('going to connect...');

        const controller = this;
        this._connProm = new Promise((resolve, reject) => {
            this._connPromResolver = resolve;
        });
        if (this.client == null) {
            this._createClient();
        } else if (!this.isConnecting){
            this.client.connect(this.uri);
        }
        await this._connProm;
    }

    disconnect() {
        if (!this.isConnected) {
            console.log('not connected already. Do nothing');
            return;
        }

        this.isConnected = false;
        this.isConnecting = false;

        if (this.client != null) {
            this.client.disconnect();
            this.client = null;
            console.log('disconnected successfully');
        }
    }

    resetDisconnectionTimer(timeout) {
        if (this.disconnectionTimerId) {
            clearTimeout(this.disconnectionTimerId);
        }
        const controller = this;

        this.disconnectionTimerId = setTimeout(() => {
            console.log('going to disconnect by timeout', timeout, 'millis');
            this.disconnect();
        }, timeout);        
    }

    _createClient() {
        const controller = this;

        var lgtv = new LGTV({
            url: controller.uri,
            timeout: 5000
        });

        lgtv.on('connecting', err => {
            controller.isConnected = false;
            controller.isConnecting = true;
        });

        lgtv.on('error', function (err) {
            controller.isConnected = false;
            controller.isConnecting = false;
            if (err.code !== 'EHOSTUNREACH') {
                error(err);
                lgtv.disconnect()
                this.client = null;
            }
        });

        lgtv.on('connect', async function () {
            console.log('connected using key: ', lgtv.clientKey);
            controller.isConnected = true;
            controller.isConnecting = false;
            if (controller._connPromResolver ) {
                controller._connPromResolver();
                controller._connPromResolver = null;
            } else {
                console.log('_connPromResolver is null');
            }
        });

        controller.client = lgtv;
    }

    async createDialog(params) {
        const dialogId = params.dialogId;
        const title = params.title;
        const message = params.message;
        const okButton = params.okButton;
        const cancelButton = params.cancelButton;

        await this.connect();

        let answSuccessCallback;
        let answRejectCallback;
        let timeoutId;
        const responsePromice = new Promise((res, rej) => {answSuccessCallback = res; answRejectCallback = rej});

        this.answerListener.once(dialogId, answ => {
            console.log(answ.button, 'button was pressed in', answ.dialogId, 'dialog');
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            answSuccessCallback(answ.button)
        })

        let buttons = [
            {
                label: okButton,
                focus: false,
                buttonType: 'ok', // 'ok' or 'cancel'
                onclick: 'luna://io.webhook.app.service/call',
                params: {'url': this.answerListener.generateUrl(dialogId, 'ok', okButton)}
            },
            {
                label: cancelButton,
                focus: true,
                buttonType: 'cancel', // 'ok' or 'cancel'
                onclick: 'luna://io.webhook.app.service/call',
                params: {'url': this.answerListener.generateUrl(dialogId, 'cancel', cancelButton)}
            }            
        ];

        const alertResponse = await this.client.requestAsPromise(WEBOS_URI_CREATE_ALERT, {
            title: title,
            message: message,
            modal: false,
            buttons: buttons,
            type: 'confirm',
            isSysReq: false
        });

        console.log('Alert', dialogId, 'is created', alertResponse);

        timeoutId = setTimeout(async () => {
            console.log('going to close alert', alertResponse.alertId, 'due to timeout');
            const closeResp = await this.client.requestAsPromise(WEBOS_URI_CLOSE_ALERT, {
                alertId: alertResponse.alertId
            });
            console.log('Now alert should be closed', closeResp);
            answRejectCallback(dialogId + ' dialog timeout');
        }, DEFAULT_ALERT_DIALOG_TIMEOUT_MILLIS);
        return await responsePromice;
    }

    async closeAlert(alertId) {
        await this.connect();
        return this.client.requestAsPromise(WEBOS_URI_CLOSE_ALERT, {
            alertId: alertId
        });
    }

    async pause() {
        await this.connect();
        return this.client.requestAsPromise(WEBOS_URI_PAUSE);
    }

    async play() {
        await this.connect();
        return this.client.requestAsPromise(WEBOS_URI_PLAY);
    }

    async getCurrentSWInformation() {
        await this.connect();
        return this.client.requestAsPromise(WEBOS_URI_SW_INFO);
    }

    async getSystemInfo() {
        await this.connect();
        return this.client.requestAsPromise(WEBOS_URI_SYSTEM_INFO);
    }

    async getAppList() {
        await this.connect();
        return this.client.requestAsPromise(WEBOS_URI_LIST_APPS);
    }
}