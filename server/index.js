const TvNotifier = require('./tv-notifier');

const tvNotifier = new TvNotifier('ws://192.168.2.10:3000');

tvNotifier.scheduleNotification({
    reminderId: 'morning',
    cronExp: '30-45 7 * * *',
    alertParams: {
        title: 'Уведомление v3',
        message: 'Пора одеваться в садик!',
        okButton: 'Одет',
        cancelButton: 'Позже'
    }
});

tvNotifier.scheduleNotification({
    reminderId: 'evening',
    cronExp: '40-59 20 * * *',
    alertParams: {
        title: 'Уведомление',
        message: 'Скоро пора спать!',
        okButton: 'Игрушки собраны',
        cancelButton: 'Позже'
    }
});
