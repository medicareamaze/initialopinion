"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const DbClient = require("./dbclient");
var PlanOut = require('planout');
class LUISExperiment extends PlanOut.Experiment {
    constructor(inputs, dbcon) {
        super(inputs);
        this.db = dbcon;
    }
    configureLogger() {
        return __awaiter(this, void 0, void 0, function* () {
            //return;
            //configure logger
            // this.db = await DbClient.connect();
            return;
        });
    }
    log(event) {
        return __awaiter(this, void 0, void 0, function* () {
            //log the event somewhere
            if (this.db == undefined)
                this.db = yield DbClient.connect();
            this.db.collection("experimentLogs").insert(event);
        });
    }
    previouslyLogged() {
        //check if we’ve already logged an event for this user
        //return this._exposureLogged; is a sane default for client-side experiments
    }
    setup() {
        //set experiment name, etc.
        this.setName('LUISExperiment');
    }
    /*
    This function should return a list of the possible parameter names that the assignment procedure may assign.
    You can optionally override this function to always return this.getDefaultParamNames() which will analyze your program at runtime to determine what the range of possible experimental parameters are. Otherwise, simply return a fixed list of the experimental parameters that your assignment procedure may assign.
    */
    getParamNames() {
        return this.getDefaultParamNames();
    }
    assign(params, args) {
        if (args.agencyID == '0001' || args.agencyID == '0002')
            params.set('welcome-dialog', new PlanOut.Ops.Random.UniformChoice({ choices: ['/Welcome-luis-' + args.agencyID, '/Welcome-luis-' + args.agencyID], 'unit': args.userID }));
        else
            params.set('welcome-dialog', '/Welcome-' + args.agencyID);
    }
}
exports.LUISExperiment = LUISExperiment;
class LUISNoRecognitionExperiment extends PlanOut.Experiment {
    constructor(inputs, dbcon) {
        super(inputs);
        this.db = dbcon;
    }
    configureLogger() {
        return __awaiter(this, void 0, void 0, function* () {
            //return;
            //configure logger
            // this.db = await DbClient.connect();
            return;
        });
    }
    log(event) {
        return __awaiter(this, void 0, void 0, function* () {
            //log the event somewhere
            if (this.db == undefined)
                this.db = yield DbClient.connect();
            this.db.collection("experimentLogs").insert(event);
        });
    }
    previouslyLogged() {
        //check if we’ve already logged an event for this user
        //return this._exposureLogged; is a sane default for client-side experiments
    }
    setup() {
        //set experiment name, etc.
        this.setName('LUISNoRecognitionExperiment');
    }
    /*
    This function should return a list of the possible parameter names that the assignment procedure may assign.
    You can optionally override this function to always return this.getDefaultParamNames() which will analyze your program at runtime to determine what the range of possible experimental parameters are. Otherwise, simply return a fixed list of the experimental parameters that your assignment procedure may assign.
    */
    getParamNames() {
        return this.getDefaultParamNames();
    }
    assign(params, args) {
        params.set('retryLUIS', new PlanOut.Ops.Random.UniformChoice({ choices: ['yes', 'no'], 'unit': args.userId }));
    }
}
exports.LUISNoRecognitionExperiment = LUISNoRecognitionExperiment;
class AdaptiveExperiment extends PlanOut.Experiment {
    constructor(inputs, dbcon) {
        super(inputs);
        this.db = dbcon;
    }
    configureLogger() {
        return __awaiter(this, void 0, void 0, function* () {
            //return;
            //configure logger
            // this.db = await DbClient.connect();
            return;
        });
    }
    log(event) {
        return __awaiter(this, void 0, void 0, function* () {
            //log the event somewhere
            if (this.db == undefined)
                this.db = yield DbClient.connect();
            this.db.collection("experimentLogs").insert(event);
        });
    }
    previouslyLogged() {
        //check if we’ve already logged an event for this user
        //return this._exposureLogged; is a sane default for client-side experiments
    }
    setup() {
        //set experiment name, etc.
        this.setName('AdaptiveExperiment');
    }
    /*
    This function should return a list of the possible parameter names that the assignment procedure may assign.
    You can optionally override this function to always return this.getDefaultParamNames() which will analyze your program at runtime to determine what the range of possible experimental parameters are. Otherwise, simply return a fixed list of the experimental parameters that your assignment procedure may assign.
    */
    getParamNames() {
        return this.getDefaultParamNames();
    }
    assign(params, args) {
        if (args.channelId == 'directline' || args.channelId == 'emulator')
            params.set('contentType', new PlanOut.Ops.Random.UniformChoice({ choices: ['adaptive', 'nonadaptive'], 'unit': args.userId }));
        else
            params.set('contentType', new PlanOut.Ops.Random.UniformChoice({ choices: ['nonadaptive', 'nonadaptive'], 'unit': args.userId }));
    }
}
exports.AdaptiveExperiment = AdaptiveExperiment;
const classes = { LUISExperiment, LUISNoRecognitionExperiment, AdaptiveExperiment };
function Experiments(name) {
    return classes[name];
}
exports.default = Experiments;
//# sourceMappingURL=Experiments.js.map