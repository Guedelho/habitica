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
            name: 'setTodos',
            url: '/tasks/user',
            callback: async (response: any) =>
                castBrutalSmash(response.data.data.id),
        })
    );
};

const getTodos = async (): Promise<any> =>
    makeRequest({
        method: 'GET',
        name: 'getTodos',
        url: '/tasks/user?type=todos',
        callback: (response: any) => response.data.data,
    });

const getParty = async (): Promise<any> =>
    makeRequest({
        method: 'GET',
        name: 'getParty',
        url: '/groups/party',
        callback: (response: any) => response.data.data,
    });

const getMyQuests = async (): Promise<any> =>
    makeRequest({
        method: 'GET',
        name: 'getMyQuests',
        url: `/members/${user}`,
        callback: (response: any) =>
            _.keys(_.pickBy(response.data.data.items.quests)),
    });

const castBrutalSmash = async (targetId: string) =>
    makeRequest({
        method: 'POST',
        name: 'castBrutalSmash',
        url: `/user/class/cast/smash?targetId=${targetId}`,
    });

const setQuest = async (groupId: string) => {
    const myQuests = await getMyQuests();
    const questKey = myQuests[_.random(0, myQuests.length - 1)];

    await makeRequest({
        method: 'POST',
        name: 'setQuest',
        url: `/groups/${groupId}/quests/invite/${questKey}`,
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
    makeRequest({
        method: 'POST',
        name: 'forceStartQuest',
        url: `/groups/${groupId}/quests/force-start`,
    });

const questController = async () => {
    console.log('Quest controller started...');
    console.log('Fetching id and quest...');
    const { id, quest } = await getParty();

    if (!id || !quest) {
        console.log("Couldn't fetch id or quest.");
        return null;
    }

    if (!quest.key) {
        console.log("There's no Quest set.");
        return setQuest(id);
    }

    if (!quest.active) {
        console.log('The Quest is inactive.');
        if (quest.leader === user) {
            console.log("I'm the Quest leader.");
            const hasPassTwelveHours =
                lastQuestInviteMoment ===
                moment()
                    .subtract(12, 'hours')
                    .format('HH');
            if (hasPassTwelveHours) {
                console.log("It's been 12 hours since I set a Quest.");
                return forceStartQuest(id);
            } else {
                console.log('12 hours have not passed. No action needed.');
            }
        } else if (!quest.members[user]) {
            console.log("I didn't accepted the Quest.");
            return acceptQuest(id);
        } else {
            console.log('I already accepted the Quest. No action needed.');
        }
    } else {
        console.log('The Quest is active. No action needed.');
    }
};

const makeRequest = ({ url, data, name, method, callback }: any = {}) =>
    baseRequest({ url, data, method })
        .then((response: any) => {
            console.log(name);
            return callback(response);
        })
        .catch(error => console.error(name, error));

// exports.test = functions.https.onRequest(async (request, response) => {
// });
