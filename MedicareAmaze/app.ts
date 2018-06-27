import * as express from 'express';
import { Twilio } from 'twilio';
import * as builder from 'botbuilder';
import * as handoff from 'botbuilder-handoff';
import * as   GraphDialog from 'bot-graph-dialog';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';
import * as  webPush from 'web-push';
import DbClient = require("./dbclient");
import { LUISExperiment } from "./Experiments";
import Experiments from "./Experiments";
import Diagnose from "./diagnosis/Diagnose";


class App {
    public async start() {
        try {
            require('dotenv').config();
            const vapidKeyFilePath = "./vapidKey.json";
            var that = this;
            //var vapidKeys = {};

            if (fs.existsSync(vapidKeyFilePath)) {
                //if the vapid file exists, then we try to parse its content 
                //to retrieve the public and private key
                //more tests might be necessary here
                try {
                    var vapidKeys = JSON.parse(fs.readFileSync(vapidKeyFilePath, "utf8"));
                }
                catch (e) {
                    console.error("There is an error with the vapid key file. Log: " + e.message);
                    process.exit(-1);
                }
            }
            else {
                //if the file did not exists, we use the web-push module to create keys
                //and store them in the file for future use
                //you should copy the public key in the index.js file
                vapidKeys = webPush.generateVAPIDKeys();
                fs.writeFileSync(vapidKeyFilePath, JSON.stringify(vapidKeys));
                console.log("No vapid key file found. One was generated. Here is the public key: " + vapidKeys.publicKey);
            }

            //here we setup the web-push module for it to be able to
            //send push notification using our public and private keys
            webPush.setVapidDetails(
                'mailto:kavitha@isals.com',
                vapidKeys.publicKey,
                vapidKeys.privateKey);
            console.log(vapidKeys.publicKey);

            const app = express();
            // Setup Express Server
             app.listen(+process.env.port || +process.env.PORT || 8080, '::', () => {                 
                console.log('Server Up Now');      
            });


            
            //Connect MedicareDB Data base and get agencies
            let db = await DbClient.connect();
            let agencyBots = await db.collection("agency").find().toArray();

            console.log(agencyBots);
            agencyBots.forEach(agency => {
                const connector = new builder.ChatConnector({
                    appId: agency.appid,
                    appPassword: agency.password
                });



                const bot = new builder.UniversalBot(connector);

                const intents = new builder.IntentDialog();
                bot.dialog('/', intents);

                intents.matches(/^(help|hi|hello)/i, [
                    session => {
                        session.send('Hi, Welcome to Initial Opinion - your free initial diagnosis tool');
                        bot.beginDialog(session.message.address, '/diagnosis');
                    }
                ]);
                bot.on('conversationUpdate', function (message) {
                    if (message.membersAdded) {
                        message.membersAdded.forEach(function (identity) {
                            if (identity.id === message.address.bot.id) {
                                if (message.address.channelId != 'directline') {
                                     var luisExperiment = new LUISExperiment({ userID: message.user.id, agencyID: agency.agencyId, sessionID: message.address.id},db);                                

                                     //console.log("User " + message.user.id + " has foo param set to " + luisExperiment.get('welcome-dialog'));
                                     //bot.beginDialog(message.address, luisExperiment.get('welcome-dialog'));  
                                     bot.beginDialog(message.address, '/diagnosis'); 
                                }
                            }
                        });
                    }
                });

                //this is a 'dictionary' in which we store every push subscription per user
                var pushPerUser = [];

                //this event handler is looking for every message sent by the bot
                //we look into the dictionary to see if we have push subscription info
                //for this user and we send a push notif with the bot message
                //this will keep send the message to the user through the channel
                bot.on("outgoing", async function (message) {
                    if (!!message.entities && message.text && (message.entities[0].agent == true || message.entities[0].customer == true)) {
                        let lead = await db.collection("leads").findOne({ leadId: message.address.user.id });
                        lead.webPushSubscription.forEach(pushsub => {                             
                            webPush.sendNotification({
                                endpoint: pushsub.endpoint,
                                TTL: "1",
                                keys: {
                                    p256dh: pushsub.key,
                                    auth: pushsub.authSecret
                                }
                            }, message.text);
                        })
                       
                        //if (pushPerUser && pushPerUser[message.address.user.id]) {
                        //    var pushsub = pushPerUser[message.address.user.id];

                        //    webPush.sendNotification({
                        //        endpoint: pushsub.endpoint,
                        //        TTL: "1",
                        //        keys: {
                        //            p256dh: pushsub.key,
                        //            auth: pushsub.authSecret
                        //        }
                        //    }, message.text);
                        //}
                    }
                });
                var isAnAgent = false;
                ////here we handle incoming "events" looking for the one which might come from 
                ////the backchannel. we add or replace the subscription info for this specific user
                bot.on("event", async function (message) {
                    //var message = session.message;
                    if (message.name === "pushsubscriptionadded") {
                        //pushPerUser[message.user.id] = message.value;
                        var webpush = [];
                        
                        let lead = await db.collection("leads").findOne({ leadId: message.user.id });
                        if (!!lead && !!lead.webPushSubscription && lead.webPushSubscription.length > 0) {
                            webpush = lead.webPushSubscription;
                        }
                        webpush.push(message.value);
                        lead = await db.collection("leads").updateOne({ leadId: message.user.id },
                            {
                                $set: { "webPushSubscription": webpush },
                                $setOnInsert: {
                                    "leadId": message.user.id,
                                    "name": message.user.name,
                                    "email": '',
                                    "mobileNumber": '',
                                    "mobileToken": '',
                                    "mobileNumberVerified": false,
                                    "mobileNumberVerifiedTime": new Date().toISOString(),
                                    "landLine": '',
                                    "zip": '',
                                    "dateOfBirth": '1950-01-01',
                                    "interviews":[],
                                    "leadIntent": [],
                                    "eligibleProductTypes": [],
                                    "interestedProductTypes": [],
                                    "offeredProducts": [],
                                    "interestedProducts": [],                                     
                                    "androidPushSubscription": [],
                                    "iosPushSubscription": [],
                                    "isAgent": false, 
                                }
                            },
                            { upsert: true, new: true }
                        );
                      

                    }                          
                    if (message.name === "newclientconnected") {  

                        var userData = JSON.parse(message.value);
                        var isAgent = false;
                        if (!!userData.roles)
                            isAgent = userData.roles.indexOf("Reviewer") >= 1 ? true : false;

                        bot.loadSession(message.address, function (error, session) {
                            session.userData.isAgent = isAgent;
                            session.save();

                        });


                        if (!isAgent) {

                            var luisExperiment = new LUISExperiment({ userID: message.user.id, agencyID: agency.agencyId, sessionID: message.address.id }, db);

                            // console.log("User " + message.user.id + " has foo param set to " + luisExperiment.get('welcome-dialog'));
                            var msgDialog = luisExperiment.get('welcome-dialog');
                           // bot.beginDialog(message.address, msgDialog);
                            bot.beginDialog(message.address, '/diagnosis');
                           // bot.beginDialog(message.address, "/myCard");
                            
                            //var reply = new builder.Message()
                            //    .address(message.address)
                            //    .text("### Hi There! How can I Help? You can type phrases like \n - I want to enroll in medicare, or\n - I want to learn about medicare, or\n - I want to to find an agent");

                            //bot.send(reply);
                        }
                        else {
                            var reply = new builder.Message()
                                .address(message.address)
                                .text("Welcome! Type 'options' to view the commands menu!");

                            bot.send(reply);

                        }



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
                //  trigger dynamic load of the dialogs
                this.loadDialogs()
                    .then(dialogs => dialogs.forEach(dialog => this.loadDialog(dialog, intents, bot)))
                    .catch(err => console.error(`error loading dialogs dynamically: ${err.message}`));

                //process.nextTick(async () => {
                //    try {
                //        var graphDialog = await GraphDialog.create({
                //            bot,
                //            scenario: 'router',
                //            loadScenario,
                //            loadHandler,
                //            customTypeHandlers: getCustomTypeHandlers()
                //        });

                //        intents.onDefault(graphDialog.getDialog());
                //    }
                //    catch (err) {
                //        console.error(`error loading dialog: ${err.message}`)
                //    }
                //});

                //=========================================================
                // Hand Off Setup
                //=========================================================

                // Replace this function with custom login/verification for agents
                const isAgent = (session: builder.Session) =>
                    // session.message.user.name == undefined ? false : session.message.user.name.startsWith("Agent");
                    session.userData.isAgent;



                handoff.setup(bot, app, isAgent, {
                    // mongodbProvider: process.env.MONGODB_PROVIDER_PROD,
                    mongodbProvider: process.env. MONGODB_PROVIDER_DEV,
                    directlineSecret: agency.directLineSecret,
                    textAnalyticsKey: process.env.CG_SENTIMENT_KEY,
                    appInsightsInstrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
                    retainData: "true",
                    customerStartHandoffCommand: process.env.CUSTOMER_START_HANDOFF_COMMAND
                });


                console.log('/api/' + agency.agencyId + '/messages');
                app.post('/api/' + agency.agencyId + '/messages', connector.listen());
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


               

                app.get('/api/' + agency.agencyId + '/leads', async (req, res,next) => {
                    try {                 
                        let leads = await db.collection("leads").find({}, {leadId:1, name: 1 ,phone:1}).toArray();
                        let jleads = JSON.stringify(leads);
                        console.log(`Leads: ${leads}`);
                        console.log(jleads);
                        res.send(jleads);
                    } catch (e) {
                        //this will eventually be handled by your error handling middleware
                        res.send(e);
                    }
                });



            })


            //twilio call
            app.get('/api/twiliocall/phone/:phone', (req, res, next) => {
                try {
               

                    const accountSid = process.env.twilio_sid;
                    const authToken = process.env.twilio_token;
                    const client = new Twilio(accountSid, authToken);
                    const MODERATOR = '';
                    var callphone = req.params.phone;
                    console.log(`Twilio Call: ${callphone}`);
                    if (callphone) {
                        client.calls
                            .create({
                                url: 'http://demo.twilio.com/docs/voice.xml',
                                to: callphone,
                                from: ''
                            })
                            .then(call => console.log(call.sid))
                            .done();
                    }
                    //client.messages.each({ limit: 10 }, function (message) {
                    //    console.log(message.body);
                    //});

                    // Download the helper library from https://www.twilio.com/docs/node/install
                    // Your Account Sid and Auth Token from twilio.com/console
                 
                    //const client = require('twilio')(accountSid, authToken);

                    //+1949397286400

                    //client.messages
                    //    .create({
                    //        body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
                    //        from: '+15017122661',
                    //        to: '+15558675310'
                    //    })
                    //    .then(message => console.log(message.sid))
                    //    .done();
                    
                } catch (e) {
                    //this will eventually be handled by your error handling middleware
                    res.send(e);
                }
            });

        }
        catch (error) {
            console.log(error);

        }
    }

    public async  loadDialog(dialog, intents, bot) {

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

    // this is the handler for loading scenarios from external datasource
    // in this implementation we're just reading it from the file scnearios/dialogs.json
    // but it can come from any external datasource like a file, db, etc.
    public loadDialogs(): Promise<Array<Object>> {
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


}
//=========================================================
// Normal Bot Setup
//=========================================================
const myApp = new App();
myApp.start();
const scenariosPath = path.join(__dirname, 'bot', 'scenarios');
const handlersPath = path.join(__dirname, 'bot', 'handlers');
const dialogsMapById = {};
const dialogsMapByPath = {};







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
        },
        {
            name: 'triggerHandoff',
            execute: (session, next, data) => {
                console.log(`in custom node type handler: triggerHandoff,`);
                handoff.triggerHandoff(session); 
                return next();
            }
        },
        {
            name: 'logExperimentEvent',
            execute: (session, next, data) => {

                console.log(`in custom node type handler: logExperimentEvent, data: ${data.ExperimentName}`);
                const ExperimentClass = Experiments(data.ExperimentName);
                var exp = new ExperimentClass({ userID: session.message.user.id });
                console.log(`in custom node type handler: logExperimentEvent, data: ${data.EventName}`);
                exp.log({ userID: session.message.user.id, name: data.ExperimentName, action: data.EventName, sessionID: session.message.address.id });
                console.log(`in custom node type handler: logExperimentEvent, data: ${data.EventName}`);
                return next();
            }
        },
        {
            name: 'getExperimentVariable',
            execute: (session, next, data) => {
                console.log(`in custom node type handler: getExperimentVariable, data: ${data.ExperimentName}`);
                const ExperimentClass = Experiments(data.ExperimentName);
               // var exp = new ExperimentClass({ userID: session.message.user.id });
                var exp = new ExperimentClass({ userId: session.message.user.id, channelId: session.message.address.channelId});
                console.log(`in custom node type handler: logExperimentEvent, data: ${data.VariableName}`);
                var experimentValue = exp.get(data.VariableName);
                Object.defineProperty(session.dialogData.data, data.VariableName, {
                    value: experimentValue,
                    writable: true,
                    enumerable: true,
                    configurable: true
                });
                console.log(`in custom node type handler: getExperimentVariable, variable: ${data.VariableName}, value: ${experimentValue}`);
                return next();
            }
        },
        {
            name: 'sendRegistrationMobileCode',
            execute: async (session, next, data) => {
                var diag = new Diagnose();
                var result = await diag.sendMobileCodeAndUpdateLead(session);                     
                return next();
            }
        },
        {
            name: 'validateMobileCode',
            execute: async (session, next, data) => {
                var diag = new Diagnose();
                var result = await diag.verifyMobileCodeAndUpdateLead(session);
                return next();
            }
        },        
        {
            name: 'initialSymptomsProcess',
            execute: async (session, next, data) => {
                var diag = new Diagnose();
                var result = await diag.initialSymptomsProcess(session);
                return next();
            }
        },
        {
            name: 'initiateDiagnosisInterview',
            execute: async (session, next, data) =>  {
                var diag = new Diagnose();
                var result =  await diag.initiateDiagnosis(session);
                return next();
            }
        },
        {
            name: 'processDiagnosisResponse',
            execute: async (session, next, data) => {
                var diag = new Diagnose();
                var riskfactors = await diag.processDiagnosis(session);
                return next();
            }
        },

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










//triggerHandoff manually
//bot.dialog('/connectToHuman', (session) => {
//    session.send("Hold on, buddy! Connecting you to the next available agent!");
//    handoff.triggerHandoff(session);
//}).triggerAction({
//    matches: /^agent/i,
//});
