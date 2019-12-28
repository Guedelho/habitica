import * as functions from 'firebase-functions';
import * as request from 'request';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const config = functions.config();
const { uri, user, key } = config.api;

export const scheduledFunctionCrontab = functions.pubsub.schedule('0 0 * * *')
    .timeZone('US/Central')
    .onRun(() => {
        const baseRequest = request.defaults({
            baseUrl: uri,
            method: 'POST',
            headers: {
                'x-api-user': user,
                'x-api-key': key,
                'Content-Type': 'application/json',
            },
            json: true,
            callback: (error, response, body) => {
                console.log('error:', error);
                console.log('statusCode:', response && response.statusCode);
                console.log('body:', body);
            },
        });
        setTodos(baseRequest);
        deleteCompletedTodos(baseRequest);
        return null;
});

const setTodos = (baseRequest: any) => {
    const body = {
        text: '',
        type: 'todo',
        priority: 2,
    };

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
        baseRequest('/tasks/user', { body });
    });
};

const deleteCompletedTodos = (baseRequest: any) => {
    const body = {
        data: [],
    }
    baseRequest('/tasks/clearCompletedTodos', { body });
};
