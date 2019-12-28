import * as functions from 'firebase-functions';
import * as request from 'request';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const config = functions.config();
const { uri, user, key } = config.api;

export const scheduledFunctionCrontab = functions.pubsub.schedule('0 0 * * *')
    .timeZone('US/Central')
    .onRun((context) => {
        request.post(`${uri}/tasks/user`)
        return null;
});

export const testGet = functions.https.onRequest((req, resp) => {
    const headers = {
        'x-api-user': user,
        'x-api-key': key,
    };
    request.get(`${uri}/tags/`, { headers }, (error, response, body) => {
        resp.send(body);
    });
});
