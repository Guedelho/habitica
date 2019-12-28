import * as functions from 'firebase-functions';
import * as request from 'request';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const config = functions.config();
const { uri, user, key } = config.api;

export const scheduledFunctionCrontabSetTodos = functions.pubsub.schedule('0 0 * * *')
    .timeZone('US/Central')
    .onRun(() => {
        const headers = {
            'x-api-user': user,
            'x-api-key': key,
        };
        const body = {
            text: '',
            type: 'todo',
            priority: 2,
        }
        const todos = [
            'Drink Water',
            'Make my Bed',
            'Exercise',
            'Shower',
            'Brush my Teeth',
            'Eat a Great Breakfest',
            'Break the Habit! The No Sugar Challenge',
            'Deep Work',
            'Learn & Study',
            'Read',
            'The 16:8 Intermittent Fasting Method',
        ];

        todos.forEach((todo) => {
            body.text = todo;
            request.post(`${uri}/tasks/user`, { headers, body }, (error, response, body) => {

            });
        });
});

export const testGet = functions.https.onRequest((req, resp) => {
    const headers = {
        'x-api-user': user,
        'x-api-key': key,
        'Content-Type': 'application/json',
    };
    const body = {
        text: '',
        type: 'todo',
        priority: 2,
    }
    const todos = [
        'Drink Water',
        'Make my Bed',
        'Exercise',
        'Shower',
        'Brush my Teeth',
        'Eat a Great Breakfest',
        'Break the Habit! The No Sugar Challenge',
        'Deep Work',
        'Learn & Study',
        'Read',
        'The 16:8 Intermittent Fasting Method',
    ];

    todos.forEach((todo) => {
        body.text = todo;
        request.post(`${uri}/tasks/user`, { headers, body, json: true }, (error, response, body) => {
            console.log('error:', error);
            console.log('statusCode:', response && response.statusCode);
            console.log('body:', body);
        });
    });
});
