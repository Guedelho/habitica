import * as _ from 'lodash';
import * as axios from 'axios';
import * as moment from 'moment';
import * as functions from 'firebase-functions';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const { api } = functions.config();
const baseRequest: axios.AxiosInstance = axios.default.create({
    baseURL: api.url,
    headers: {
        'x-api-key': api.key,
        'x-api-user': api.user,
    },
});
const timeZone: string = 'America/Sao_Paulo';
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
let momentLastQuestInvite: string = '';

// export const scheduledFunctionCrontabToRunEveryTwoHours = functions.pubsub
//     .schedule('0 */2 * * *')
//     .timeZone(timeZone)
//     .onRun(async () => {
//         await questController();
//         return null;
//     });

export const scheduledFunctionCrontabToRunEveryDayAtMidnight = functions.pubsub
    .schedule('0 0 * * *')
    .timeZone(timeZone)
    .onRun(async () => {
        await setTodos();
        await castBrutalSmashOnTasks();
        return null;
    });

const setTodos = async () => {
    const todos = await getTasks('todos');
    const fetchedTodosList = _.map(todos, 'text');
    const todosDiff = _.difference(myTodosList, fetchedTodosList);

    await Promise.all(
        _.map(todosDiff, async text =>
            await makeRequest({
                log: 'Setting Todos...',
                data: {
                    text,
                    type: 'todo',
                    priority: 2,
                },
                method: 'POST',
                url: '/tasks/user',
            })
        )
    );
};

const getTasks = async (type: string): Promise<any> =>
    makeRequest({
        log: 'Getting Tasks...',
        method: 'GET',
        url: `/tasks/user?type=${type}`,
    });

const getParty = async (): Promise<any> =>
    makeRequest({
        log: 'Getting Party...',
        method: 'GET',
        url: '/groups/party',
    });

const getMember = async (memberId: string): Promise<any> =>
    makeRequest({
        log: 'Getting Member...',
        method: 'GET',
        url: `/members/${memberId}`,
    });

const castBrutalSmashOnTasks = async () => {
    const member = await getMember(api.user);
    const todos = await getTasks('todos');
    const dailys = await getTasks('dailys');

    const spellManaCost = 10;
    const tasks = [...todos, ...dailys];
    const filteredTasks = _.filter(tasks, (task: any) => _.isEmpty(task.challenge));
    const tasksIds = _.map(filteredTasks, 'id');

    let mana = _.get(member, 'stats.mp');

    while (mana >= spellManaCost && tasksIds.length) {
        const targetId = tasksIds.pop();
        await makeRequest({
            log: 'Casting Brutal Smash...',
            method: 'POST',
            url: `/user/class/cast/smash?targetId=${targetId}`,
        });
        mana -= spellManaCost;
    }
};

const setQuest = async (groupId: string) => {
    const member = await getMember(api.user);
    const quests = _.keys(_.pickBy(_.get(member, 'items.quests')));
    const questKey = quests[_.random(0, quests.length - 1)];

    await makeRequest({
        log: 'Setting Quest...',
        method: 'POST',
        url: `/groups/${groupId}/quests/invite/${questKey}`,
    });
    momentLastQuestInvite = moment().format('HH');
};

const acceptQuest = async (groupId: string) =>
    makeRequest({
        log: 'Accepting Quest...',
        method: 'POST',
        url: `/groups/${groupId}/quests/accept`,
    });

const forceStartQuest = async (groupId: string) =>
    makeRequest({
        log: 'Forcing Start Quest...',
        method: 'POST',
        url: `/groups/${groupId}/quests/force-start`,
    });

const questController = async () => {
    console.log('Quest controller started...');
    const { id, quest } = await getParty();

    if (!id || !quest) {
        console.log("Couldn't fetch party.");
        return null;
    }

    if (!quest.key) {
        console.log("There's no Quest set.");
        return setQuest(id);
    }

    if (!quest.active) {
        console.log('The Quest is inactive.');
        if (quest.leader === api.user) {
            console.log("I'm the Quest leader.");
            const momentHoursAgo = moment()
                .subtract(8, 'hours')
                .format('HH');
            console.log('I set the Quest at ', momentLastQuestInvite);
            if (momentLastQuestInvite === momentHoursAgo) {
                console.log("It's been 8 hours since I set a Quest.");
                return forceStartQuest(id);
            } else {
                console.log('8 hours have not passed. No action needed.');
            }
        } else if (!quest.members[api.user]) {
            console.log("I didn't accepted the Quest.");
            return acceptQuest(id);
        } else {
            console.log('I already accepted the Quest. No action needed.');
        }
    } else {
        console.log('The Quest is active. No action needed.');
    }
};

const makeRequest = ({ log, url, data, method }: any = {}) =>
    baseRequest({ url, data, method })
        .then((response: any) => {
            console.log(log, method, url, 'Success!');
            return _.get(response, 'data.data');
        })
        .catch(error => console.error(log, method, url, error));

// exports.test = functions.https.onRequest(async (request, response) => {
// });
