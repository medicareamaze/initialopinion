import * as express from 'express';
import * as builder from 'botbuilder';
import * as handoff from 'botbuilder-handoff';
import * as   GraphDialog from 'bot-graph-dialog';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';

//=========================================================
// Normal Bot Setup
//=========================================================

const app = express();

// Setup Express Server
app.listen(process.env.port || process.env.PORT || 3978, '::', () => {
    console.log('Server Up');
});

// Create chat bot
//const connector = new builder.ChatConnector({
//    appId: process.env.MICROSOFT_APP_ID,
//    appPassword: process.env.MICROSOFT_APP_PASSWORD
//});
const connector = new builder.ChatConnector({
    appId: "339e69bc-8c53-41d9-95b4-1b628a6f0969",
    appPassword: "lqhZMTV34{_vexoFSQ324-="
});



const bot = new builder.UniversalBot(connector);
const intents = new builder.IntentDialog();

const scenariosPath = path.join(__dirname, 'bot', 'scenarios');
const handlersPath = path.join(__dirname, 'bot', 'handlers');
const dialogsMapById = {};
const dialogsMapByPath = {};

bot.dialog('/', intents);

intents.matches(/^(help|hi|hello)/i, [
    session => {
        session.send('Hi, how can I help you?');
    }
]);
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, '/WelcomeAndLead');


            }
        });
    }
});


async function loadDialog(dialog) {

    console.log(`loading scenario: ${dialog.scenario} for regex: ${dialog.regex}`);

    var re = new RegExp(dialog.regex, 'i');

    intents.matches(re, [
        function (session) {
            session.beginDialog(dialog.path);
        }
    ]);

    try {
        var graphDialog = await GraphDialog.create({
            bot,
            scenario: dialog.scenario,
            loadScenario,
            loadHandler,
            customTypeHandlers: getCustomTypeHandlers(),
            onBeforeProcessingStep
        });
    }
    catch (err) {
        console.error(`error loading dialog: ${err.message}`);
        throw err;
    }

    dialog.graphDialog = graphDialog;
    dialogsMapById[graphDialog.getDialogId()] = dialog;
    dialogsMapByPath[dialog.path] = dialog;

    bot.dialog(dialog.path, graphDialog.getDialog());
    console.log(`graph dialog loaded successfully: scenario ${dialog.scenario} version ${graphDialog.getDialogVersion()} for regExp: ${dialog.regex} on path ${dialog.path}`);

}

// trigger dynamic load of the dialogs
loadDialogs()
    .then(dialogs => dialogs.forEach(dialog => loadDialog(dialog)))
    .catch(err => console.error(`error loading dialogs dynamically: ${err.message}`));

// intercept change in scenario version before processing each dialog step
// if there was a change in the version, restart the dialog
// TODO: think about adding this internally to the GraphDialog so users gets this as default behaviour.
function onBeforeProcessingStep(session, args, next) {

    session.sendTyping();
    var dialogVersion = this.getDialogVersion();

    if (!session.privateConversationData._dialogVersion) {
        session.privateConversationData._dialogVersion = dialogVersion;
    }

    if (session.privateConversationData._dialogVersion !== dialogVersion) {
        session.send("Dialog updated. We'll have to start over.");
        return this.restartDialog(session);
    }

    return next();
}


// this allows you to extend the json with more custom node types, 
// by providing your implementation to processing each custom type.
// in the end of your implemention you should call the next callbacks
// to allow the framework to continue with the dialog.
// refer to the customTypeStepDemo node in the stomachPain.json scenario for an example.
function getCustomTypeHandlers() {
    return [
        {
            name: 'myCustomType',
            execute: (session, next, data) => {
                console.log(`in custom node type handler: customTypeStepDemo, data: ${data.someData}`);
                return next();
            }
        }
    ];
}

// this is the handler for loading scenarios from external datasource
// in this implementation we're just reading it from a file
// but it can come from any external datasource like a file, db, etc.
function loadScenario(scenario) {
    return new Promise((resolve, reject) => {
        console.log('loading scenario', scenario);
        // implement loadScenario from external datasource.
        // in this example we're loading from local file
        var scenarioPath = path.join(scenariosPath, scenario + '.json');

        return fs.readFile(scenarioPath, 'utf8', (err, content) => {
            if (err) {
                console.error("error loading json: " + scenarioPath);
                return reject(err);
            }

            var scenarioObj = JSON.parse(content);

            // simulating long load period
            setTimeout(() => {
                console.log('resolving scenario', scenarioPath);
                resolve(scenarioObj);
            }, Math.random() * 3000);
        });
    });
}

// this is the handler for loading handlers from external datasource
// in this implementation we're just reading it from a file
// but it can come from any external datasource like a file, db, etc.
//
// NOTE:  handlers can also be embeded in the scenario json. See scenarios/botGames.json for an example.
function loadHandler(handler) {
    return new Promise((resolve, reject) => {
        console.log('loading handler', handler);
        // implement loadHandler from external datasource.
        // in this example we're loading from local file
        var handlerPath = path.join(handlersPath, handler);
        var handlerString = null;
        return fs.readFile(handlerPath, 'utf8', (err, content) => {
            if (err) {
                console.error("error loading handler: " + handlerPath);
                return reject(err);
            }
            // simulating long load period
            setTimeout(() => {
                console.log('resolving handler', handler);
                resolve(content);
            }, Math.random() * 3000);
        });
    });
}

// this is the handler for loading scenarios from external datasource
// in this implementation we're just reading it from the file scnearios/dialogs.json
// but it can come from any external datasource like a file, db, etc.
function loadDialogs(): Promise<Array<Object>> {
    return new Promise((resolve, reject) => {
        console.log('loading dialogs');

        var dialogsPath = path.join(scenariosPath, "dialogs.json");
        return fs.readFile(dialogsPath, 'utf8', (err, content) => {
            if (err) {
                console.error("error loading json: " + dialogsPath);
                return reject(err);
            }

            var dialogs = JSON.parse(content);

            // simulating long load period
            setTimeout(() => {
                console.log('resolving dialogs', dialogsPath);
                resolve(dialogs.dialogs);
            }, Math.random() * 3000);
        });
    });
}


app.post('/api/messages', connector.listen());

// endpoint for reloading scenario on demand
app.get('/api/load/:scenario', async (req, res) => {
    var scenario = req.params.scenario;
    console.log(`reloading scenario: ${scenario}`);
    var dialog = dialogsMapById[scenario];

    try {
        await dialog.graphDialog.reload();
        var msg = `scenario id '${scenario}' reloaded`;
        console.log(msg);
        return res.end(msg);
    }
    catch (err) {
        return res.end(`error loading dialog: ${err.message}`)
    }

});
// Create endpoint for agent / call center
app.use('/webchat', express.static('public'));


//=========================================================
// Hand Off Setup
//=========================================================

// Replace this function with custom login/verification for agents
const isAgent = (session: builder.Session) =>
    session.message.user.name == undefined ? false : session.message.user.name.startsWith("Agent");


/**
    bot: builder.UniversalBot
    app: express ( e.g. const app = express(); )
    isAgent: function to determine when agent is talking to the bot
    options: { }
**/
handoff.setup(bot, app, isAgent, {
   // mongodbProvider: process.env.MONGODB_PROVIDER,
    mongodbProvider:"mongodb://localhost:27017",
    directlineSecret: "2Hm4D6FkXbA.cwA.O68.abl1MOHLN0MmXkUyMmGlHBE72KBQUvQ2Kmnhel3BF3A",
    textAnalyticsKey: process.env.CG_SENTIMENT_KEY,
    appInsightsInstrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
    retainData: process.env.RETAIN_DATA,
    customerStartHandoffCommand: process.env.CUSTOMER_START_HANDOFF_COMMAND
});

//triggerHandoff manually
//bot.dialog('/connectToHuman', (session) => {
//    session.send("Hold on, buddy! Connecting you to the next available agent!");
//    handoff.triggerHandoff(session);
//}).triggerAction({
//    matches: /^agent/i,
//});