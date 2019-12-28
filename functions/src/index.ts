import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const scheduledFunctionCrontab = functions.pubsub.schedule('0 0 * * *')
    .timeZone('US/Central')
    .onRun((context) => {
        console.log(admin.database.ServerValue.TIMESTAMP);
    return null;
});
