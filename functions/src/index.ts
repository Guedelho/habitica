import * as _ from 'lodash';
import * as axios from 'axios';
import * as functions from 'firebase-functions';

const config = functions.config();
const { url, user, key } = config.api;

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const baseRequest = axios.default.create({
    baseURL: url,
    headers: {
        'x-api-key': key,
        'x-api-user': user,
    },
});

export const scheduledFunctionCrontab = functions.pubsub
    .schedule('0 0 * * *')
    .timeZone('US/Central')
    .onRun(async () => {
        deleteCompletedTodos();
        setTodos().catch(callbackError);
        return null;
    });

const setTodos = async () => {
    const todos = await getTodos();
    const fetchedTodosList = todos.map((todo: any) => todo.text);
    const mainTodosList = [
        'Read',
        'Shower',
        'Exercise',
        'Deep Work',
        'Drink Water',
        'Make my Bed',
        'Learn & Study',
        'Brush my Teeth',
        'Eat a Great Breakfest',
        'The 16:8 Intermittent Fasting Method',
        'Break the Habit! The No Sugar Challenge',
    ];
    const todosDiff = _.difference(mainTodosList, fetchedTodosList);
    const body = {
        text: '',
        type: 'todo',
        priority: 2,
    };

    todosDiff.forEach(todo => {
        body.text = todo;

        baseRequest.post('/tasks/user', body).catch(callbackError);
    });

    return null;
};

const deleteCompletedTodos = () => {
    const body = {
        data: [],
    };

    baseRequest.post('/tasks/clearCompletedTodos', body).catch(callbackError);
};

const getTodos = async (): Promise<any> => {
    const type = 'todos';
    let todos = [];

    try {
        const response = await baseRequest.get(`/tasks/user?type=${type}`);
        todos = response.data.data;
    } catch (error) {
        console.error(error);
    }

    return todos;
};

const callbackError = (error: any) => console.error(error);
