import * as functions from 'firebase-functions';
import * as request from 'request';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const config = functions.config();
const { uri, user, key } = config.api;

const baseRequest = request.defaults({
    json: true,
    baseUrl: uri,
    headers: {
        'x-api-key': key,
        'x-api-user': user,
        'Content-Type': 'application/json',
    },
    callback: (error, response, body) => {
        if (response && response.statusCode === 200) {
            console.log(body);
            return body;
        }
        if (error) throw error;
    },
});

export const scheduledFunctionCrontab = functions.pubsub
    .schedule('0 0 * * *')
    .timeZone('US/Central')
    .onRun(() => {
        setTodos();
        deleteCompletedTodos();
        deleteIncompletedTodos();
        return null;
    });

const setTodos = () => {
    const options = {
        body: {
            text: '',
            type: 'todo',
            priority: 2,
        },
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

    todos.forEach(todo => {
        options.body.text = todo;
        baseRequest.post('/tasks/user', options);
    });
};

const deleteCompletedTodos = () => {
    const options = {
        body: {
            data: [],
        },
    };
    baseRequest.post('/tasks/clearCompletedTodos', options);
};

const deleteIncompletedTodos = () => {
    const type = 'todos';

    const callback = (error: any, response: any, body: any) => {
        if (response && response.statusCode === 200) {
            const todos = body.data;

            todos.forEach((todo: any) => {
                baseRequest.delete(`/tasks/${todo.id}`);
            });
            return null;
        }
        throw error;
    };
    baseRequest.get(`/tasks/user?type=${type}`, callback);
};
