import DbClient = require("./dbclient");
var PlanOut = require('planout');


export class LUISExperiment extends (PlanOut.Experiment as {new(inputs:any):any;})  {
    
    private  db: any;
    constructor(inputs:any,dbcon:any) {
        super(inputs);
        this.db = dbcon;
        
    }
    async configureLogger() {
        //return;
        //configure logger
       // this.db = await DbClient.connect();
        return;


    }

   
    async log(event) {
        //log the event somewhere
        if (this.db == undefined) this.db = await DbClient.connect();
        this.db.collection("experimentLogs").insert(event);
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

export class LUISNoRecognitionExperiment extends (PlanOut.Experiment as { new (inputs: any): any; }) {

    private db: any;
    constructor(inputs: any, dbcon: any) {
        super(inputs);
        this.db = dbcon;

    }
    async configureLogger() {
        //return;
        //configure logger
        // this.db = await DbClient.connect();
        return;


    }


    async log(event) {
        //log the event somewhere
        if (this.db == undefined) this.db = await DbClient.connect();
        this.db.collection("experimentLogs").insert(event);
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

export class AdaptiveExperiment extends (PlanOut.Experiment as { new (inputs: any): any; }) {

    private db: any;
    constructor(inputs: any, dbcon: any) {
        super(inputs);
        this.db = dbcon;

    }
    async configureLogger() {
        //return;
        //configure logger
        // this.db = await DbClient.connect();
        return;


    }


    async log(event) {
        //log the event somewhere
        if (this.db == undefined) this.db = await DbClient.connect();
        this.db.collection("experimentLogs").insert(event);
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
        if (args.channelId == 'directline' || args.channelId == 'emulator'  )
            params.set('contentType', new PlanOut.Ops.Random.UniformChoice({ choices: ['adaptive', 'nonadaptive'], 'unit': args.userId }));
        else
            params.set('contentType', new PlanOut.Ops.Random.UniformChoice({ choices: ['nonadaptive', 'nonadaptive'], 'unit': args.userId}));

    }

}

const classes = { LUISExperiment, LUISNoRecognitionExperiment, AdaptiveExperiment };

export default function Experiments(name) {
    return classes[name];
}



