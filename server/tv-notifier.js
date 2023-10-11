var cron = require('node-cron');
const TvController = require('./tv-controller');

async function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

module.exports = class TvNotifier {
    constructor(uri) {
        this.tvController = new TvController(uri);
        this.lastExecutionTimestamp = new Map();
    }

    scheduleNotification(params) {
        const notificationId = params.id;
        const cronExp = params.cronExp;
        const alertParams = params.alertParams;

        const lastExecutionTimestamp = this.lastExecutionTimestamp;

        const tvController = this.tvController;
    
        if (!lastExecutionTimestamp.has(notificationId)) {
            lastExecutionTimestamp.set(notificationId, 0);
        }
    
        cron.schedule(cronExp, async () => {
            const now = Date.now();
            const lastEveningExecutionTime = lastExecutionTimestamp.get(notificationId);
    
            if ((now - lastEveningExecutionTime) < 3600_000) {
                return;
            }
        
            console.log('going to showEveningReminder. Now:', now, 'lastEveningExecutionTime', lastEveningExecutionTime);
        
            try {
                await tvController.pause();
    
                alertParams.dialogId = notificationId;
                var resp = await tvController.createDialog(alertParams);
        
                if (resp === alertParams.okButton) {
                    tvController.resetDisconnectionTimer(300_000);
                    lastExecutionTimestamp.set(notificationId, now);
                    console.log('Job is done with', resp,'lastEveningExecutionTime', now);
                } else {
                    console.log('Nope. Will remind withing a minute once again');
                }
            } catch(e) {
                console.error('Unable to show dialog due to', e);
            }
        }, {
            name: notificationId
        });
        
    }
    
}