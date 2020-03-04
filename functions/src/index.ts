import * as _ from 'lodash';
import * as axios from 'axios';
import * as moment from 'moment';
import * as functions from 'firebase-functions';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const { url, user, key } = functions.config().api;
const baseRequest: axios.AxiosInstance = axios.default.create({
    baseURL: url,
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
    const todosDiff = _.difference(myTodosList, fetchedTodosList);

    todosDiff.forEach(text => {
        const body = {
            text,
            type: 'todo',
            priority: 2,
        };

        baseRequest.post('/tasks/user', body).catch(callbackError);
    });
};

const getTodos = async (): Promise<any> => {
    let todos;

    try {
        const response = await baseRequest.get('/tasks/user?type=todos');
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

const forceStartQuest = async (groupId: string) => {
    try {
        await baseRequest.post(`/groups/${groupId}/quests/force-start`);
        lastQuestInviteMoment = '';
    } catch (error) {
        console.error(error);
    }
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
                forceStartQuest(id).catch(callbackError);
            }
        } else if (!quest.members[user]) {
            joinQuest(id);
        }
    } else {
        setQuest(id).catch(callbackError);
    }
};

const callbackError = (error: any) => console.error(error);
