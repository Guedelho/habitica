import * as _ from 'lodash';
import * as axios from 'axios';
import * as moment from 'moment';
import * as functions from 'firebase-functions';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const { url: baseURL, user, key } = functions.config().api;
const baseRequest: axios.AxiosInstance = axios.default.create({
    baseURL,
    headers: {
        'x-api-key': key,
        'x-api-user': user,
    },
});
const timeZone: string = 'US/Central';
const myTodosList: Array<string> = [
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
let lastQuestInviteMoment: string = '';

export const scheduledFunctionCrontabToRunEveryTwoHours = functions.pubsub
    .schedule('0 */2 * * *')
    .timeZone(timeZone)
    .onRun(async () => {
        await questController();
        return null;
    });

export const scheduledFunctionCrontabToRunEveryDayAtMidnight = functions.pubsub
    .schedule('0 0 * * *')
    .timeZone(timeZone)
    .onRun(async () => {
        await setTodos();
        return null;
    });

const setTodos = async () => {
    const todos = await getTodos();
    const fetchedTodosList = todos.map((todo: any) => todo.text);
    const todosDiff = _.difference(myTodosList, fetchedTodosList);

    todosDiff.forEach(async text => {
        const data = {
            text,
            type: 'todo',
            priority: 2,
        };

        await makeRequest({
            data,
            method: 'POST',
            name: 'setTodos',
            url: '/tasks/user',
        });
    });
};

const getTodos = async (): Promise<any> => {
    let todos;

    await makeRequest({
        method: 'GET',
        name: 'getTodos',
        url: '/tasks/user?type=todos',
        callback: (response: any) => (todos = response.data.data),
    });

    return todos;
};

const getParty = async (): Promise<any> => {
    let party;

    await makeRequest({
        method: 'GET',
        name: 'getParty',
        url: '/groups/party',
        callback: (response: any) => (party = response.data.data),
    });

    return party;
};

const getMyQuests = async (): Promise<any> => {
    let myQuests;

    await makeRequest({
        method: 'GET',
        name: 'getMyQuests',
        url: `/members/${user}`,
        callback: (response: any) =>
            (myQuests = _.keys(response.data.data.achievements.quests)),
    });

    return myQuests;
};

const setQuest = async (groupId: string) => {
    const myQuests = await getMyQuests();
    const randomNumber = Math.floor(
        Math.random() * Math.floor(myQuests.length - 1)
    );
    const questKey = myQuests[randomNumber];

    await makeRequest({
        url: 'POST',
        name: 'setQuest',
        method: `/groups/${groupId}/quests/invite/${questKey}`,
        callback: () => (lastQuestInviteMoment = moment().format('HH')),
    });
};

const acceptQuest = async (groupId: string) =>
    makeRequest({
        method: 'POST',
        name: 'acceptQuest',
        url: `/groups/${groupId}/quests/accept`,
    });

const forceStartQuest = async (groupId: string) =>
    await makeRequest({
        method: 'POST',
        name: 'forceStartQuest',
        url: `/groups/${groupId}/quests/force-start`,
    });

const questController = async () => {
    const { id, quest } = await getParty();

    if (quest.key && !quest.active) {
        if (quest.leader === quest.user) {
            const hasPassTwelveHours =
                lastQuestInviteMoment ===
                moment()
                    .subtract(12, 'hours')
                    .format('HH');
            if (hasPassTwelveHours) {
                await forceStartQuest(id);
            }
        } else if (!quest.members[user]) {
            await acceptQuest(id);
        }
    } else {
        await setQuest(id);
    }
};

const makeRequest = async ({ url, name, data, method, callback }: any = {}) => {
    try {
        const response = await baseRequest(url, { data, method });
        callback && callback(response);
        console.log(name);
    } catch (error) {
        console.error(error);
    }
};
