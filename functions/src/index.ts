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

    const method = 'POST';
    const name = 'setTodos';
    const url = '/tasks/user';

    todosDiff.forEach(async text => {
        const data = {
            text,
            type: 'todo',
            priority: 2,
        };

        await makeRequest({
            url,
            name,
            data,
            method,
        });
    });
};

const getTodos = async (): Promise<any> => {
    let todos;

    const method = 'GET';
    const name = 'getTodos';
    const url = '/tasks/user?type=todos';
    const callback = (response: any) => (todos = response.data.data);

    await makeRequest({
        url,
        name,
        method,
        callback,
    });

    return todos;
};

const getParty = async (): Promise<any> => {
    let party;

    const method = 'GET';
    const name = 'getParty';
    const url = '/groups/party';
    const callback = (response: any) => (party = response.data.data);

    await makeRequest({
        url,
        name,
        method,
        callback,
    });

    return party;
};

const getMyQuests = async (): Promise<any> => {
    let myQuests;

    const method = 'GET';
    const name = 'getMyQuests';
    const url = `/members/${user}`;
    const callback = (response: any) =>
        (myQuests = _.keys(response.data.data.achievements.quests));

    await makeRequest({
        url,
        name,
        method,
        callback,
    });

    return myQuests;
};

const setQuest = async (groupId: string) => {
    const myQuests = await getMyQuests();
    const randomNumber = Math.floor(
        Math.random() * Math.floor(myQuests.length - 1)
    );
    const questKey = myQuests[randomNumber];

    const method = 'POST';
    const name = 'setQuest';
    const url = `/groups/${groupId}/quests/invite/${questKey}`;
    const callback = () => (lastQuestInviteMoment = moment().format('HH'));

    await makeRequest({
        url,
        name,
        method,
        callback,
    });
};

const acceptQuest = async (groupId: string) => {
    const method = 'POST';
    const name = 'acceptQuest';
    const url = `/groups/${groupId}/quests/accept`;

    await makeRequest({
        url,
        name,
        method,
    });
};

const forceStartQuest = async (groupId: string) => {
    const method = 'POST';
    const name = 'forceStartQuest';
    const url = `/groups/${groupId}/quests/force-start`;

    await makeRequest({
        url,
        name,
        method,
    });
};

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
