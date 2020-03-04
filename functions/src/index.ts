import * as _ from 'lodash';
import * as axios from 'axios';
import * as moment from 'moment';
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

const timeZone = 'US/Central';
let lastQuestInviteMoment: string;

export const scheduledFunctionCrontabToRunEveryHour = functions.pubsub
    .schedule('0 */2 * * *')
    .timeZone(timeZone)
    .onRun(async () => {
        questController().catch(callbackError);
        return null;
    });

export const scheduledFunctionCrontabToRunEveryDayAtMidnight = functions.pubsub
    .schedule('0 0 * * *')
    .timeZone(timeZone)
    .onRun(async () => {
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

    todosDiff.forEach(text => {
        const body = {
            text,
            type: 'todo',
            priority: 2,
        };

        baseRequest.post('/tasks/user', body).catch(callbackError);
    });

    return null;
};

const getTodos = async (): Promise<any> => {
    const type = 'todos';
    let todos;

    try {
        const response = await baseRequest.get(`/tasks/user?type=${type}`);
        todos = response.data.data;
    } catch (error) {
        console.error(error);
    }

    return todos;
};

const getParty = async (): Promise<any> => {
    let party;

    try {
        const response = await baseRequest.get('/groups/party');
        party = response.data.data;
    } catch (error) {
        console.error(error);
    }

    return party;
};

const getMyQuests = async (): Promise<any> => {
    let myQuests;

    try {
        const response = await baseRequest.get(`/members/${user}`);
        myQuests = _.keys(response.data.data.achievements.quests);
    } catch (error) {
        console.error(error);
    }

    return myQuests;
};

const setQuest = async (groupId: string) => {
    const myQuests = await getMyQuests();
    const randomNumber = Math.floor(
        Math.random() * Math.floor(myQuests.length - 1)
    );
    const questKey = myQuests[randomNumber];

    try {
        await baseRequest.post(`/groups/${groupId}/quests/invite/${questKey}`);
        lastQuestInviteMoment = moment().format('HH');
    } catch (error) {
        console.error(error);
    }
};

const joinQuest = (groupId: string) => {
    baseRequest.post(`/groups/${groupId}/quests/accept`).catch(callbackError);
};

const forceStartQuest = (groupId: string) => {
    lastQuestInviteMoment = '';
    baseRequest
        .post(`/groups/${groupId}/quests/force-start`)
        .catch(callbackError);
};

const questController = async () => {
    const { id: groupId, quest } = await getParty();

    if (quest.leader === quest.user) {
        const hasPassTwelveHours =
            lastQuestInviteMoment ===
            moment()
                .subtract(12, 'hours')
                .format('HH');
        if (hasPassTwelveHours) {
            forceStartQuest(groupId);
        }
        return;
    }

    if (quest.key) {
        if (!quest.active && !quest.members[user]) {
            joinQuest(groupId);
        }
    } else {
        setQuest(groupId).catch(callbackError);
    }
};

const callbackError = (error: any) => console.error(error);
