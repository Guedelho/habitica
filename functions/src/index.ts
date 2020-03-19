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

export const scheduledFunctionCrontabToRunEveryHour = functions.pubsub
    .schedule('0 */1 * * *')
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

    todosDiff.forEach(async text =>
        makeRequest({
            data: {
                text,
                type: 'todo',
                priority: 2,
            },
            method: 'POST',
            url: '/tasks/user',
            callback: async (response: any) =>
                castBrutalSmash(response.data.data.id),
        })
    );
};

const getTodos = async (): Promise<any> =>
    makeRequest({
        method: 'GET',
        url: '/tasks/user?type=todos',
        callback: (response: any) => response.data.data,
    });

const getParty = async (): Promise<any> =>
    makeRequest({
        method: 'GET',
        url: '/groups/party',
        callback: (response: any) => response.data.data,
    });

const getMyQuests = async (): Promise<any> =>
    makeRequest({
        method: 'GET',
        url: `/members/${user}`,
        callback: (response: any) =>
            _.keys(_.pickBy(response.data.data.items.quests)),
    });

const castBrutalSmash = async (targetId: string) =>
    makeRequest({
        method: 'POST',
        url: `/user/class/cast/smash?targetId=${targetId}`,
    });

const setQuest = async (groupId: string) => {
    const myQuests = await getMyQuests();
    const questKey = myQuests[_.random(0, myQuests.length - 1)];

    await makeRequest({
        method: 'POST',
        url: `/groups/${groupId}/quests/invite/${questKey}`,
        callback: () => (lastQuestInviteMoment = moment().format('HH')),
    });
};

const acceptQuest = async (groupId: string) =>
    makeRequest({
        method: 'POST',
        url: `/groups/${groupId}/quests/accept`,
    });

const forceStartQuest = async (groupId: string) =>
    makeRequest({
        method: 'POST',
        url: `/groups/${groupId}/quests/force-start`,
    });

const questController = async () => {
    const { id, quest } = await getParty();

    if (quest.key) {
        if (!quest.active) {
            if (quest.leader === user) {
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
        }
    } else {
        await setQuest(id);
    }
};

const makeRequest = ({ url, data, method, callback }: any = {}) =>
    baseRequest({ url, data, method })
        .then(callback)
        .catch(error => console.error(error));

// exports.test = functions.https.onRequest(async (request, response) => {
// });
