﻿import fetch from 'node-fetch';
var Client = require('node-rest-client').Client;  
var uniqid = require('uniqid');

export interface evidenceItem {
    id: string,
    choice_id: string,
    initial: boolean
    
}  

export interface choice {
    id: string,
    label:string
}

export interface questionItem {
    id: string,
    name: string,
    choices : [choice]
}

export interface question {
    items: [questionItem],
    text: string,
    type: string

}   
  
export interface Interview {
    interview_id: string,
    sex: string,
    age: number
    evidence: [evidenceItem]
}

export default  class Diagnose {
    private baseUrl: string = 'https://api.infermedica.com/v2/';
    private restc: any = new Client();
    private appId: string;
    private appKey: string;
    private apiModel: string;
    private interviewId: string;
    private args: any;
   // private options: rm.IRequestOptions;
    
     constructor(appId = '9bc9415c', appKey = '387c1eafe462e39db49dfd1399fc0988', apiModel = 'infermedica-en', interviewId='default-user'  ) {
        //this.appId = appId;
        //this.appKey = appKey; 
        //this.apiModel = apiModel;
        //this.interviewId = interviewId;
        this.args = {
            data: {},
            headers: {
                'App-Id': appId,
                'App-Key': appKey,
                'Model': apiModel,
                'Content-Type': 'application/json',
                'Interview-Id': interviewId
            }
            
        };

   
        
       

    }

     public  getRiskFactors() {
           //this.restc.get(this.baseUrl + 'risk_factors', this.args,
           //  function (data, response) {
           //      // parsed response body as js object
           //      console.log(data);
           //      // raw response                                                                                //DiagnosisRequest {
         //    sex(string) = ['male', 'female'],
         //        age(integer),
         //        evidence(Array[Evidence], optional),
         //        extras(object, optional),
         //        evaluated_at(string, optional): time when diagnosis was evaluated in ISO 8601 format
         //}
         //Evidence {
         //    id(string): id of observation or condition ,
         //        initial(boolean, optional): true for initial evidence, false for evidence reported during interview ,
         //            related(boolean, optional): true for related evidence, false for evidence reported during interview ,
         //                choice_id(string) = ['present', 'absent', 'unknown'],
         //                observed_at(string, optional): time when evidence was observed in ISO 8601 format
         //}
           //      console.log(response);
           //  });                  
      
     }
     
     public async initialSymptomsProcess(session) {
         var evidences = [];
         var complaint = session.dialogData.data.complaint;
         var complaintText = { text: complaint };








         const res = await fetch(this.baseUrl + 'parse', { method: 'POST', body: JSON.stringify(complaintText), headers: this.args.headers });
         const json = await res.json();
         session.userData["nlm"] = json;
         if (json.mentions && json.mentions.length>0) {
             json.mentions.forEach(mention => {
                 var symptom = { id: mention.id, choice_id: mention.choice_id, initial: true }
                 evidences.push(symptom);
             });
         }
         session.userData["evidences"] = evidences;

     }
     public async initiateDiagnosis(session) {
         var evidences = session.userData["evidences"] || [];     
         var bmiOver30 = 'unknown';
         try {
             var height = session.dialogData.data.height;
             var weight = session.dialogData.data.weight;
             var bmi = (weight * 0.45) / ((height * .025) * (height * .025));

             var bmiOver30 = bmi > 30 ? 'present' : 'absent';
             var bmiEvidence = { id: 'p_7', choice_id: bmiOver30 }
         }
         catch (ex)
         {
             console.log('BMI Error - Defaulted to unknown');
         }
             evidences.push(bmiEvidence);
         try {
             for (var prop in session.dialogData.data) {
                 if (session.dialogData.data[prop] && ["p_8", "p_9", "p_10", "p_28", "p_69", "p_147"].indexOf(prop) > 0) {
                     var evidenceValue = "unknown"
                     if (session.dialogData.data[prop] == "Yes")
                         evidenceValue = "present";
                     else if ((session.dialogData.data[prop] == "No"))
                         evidenceValue = "absent";
                     else if ((session.dialogData.data[prop] == "Dont Know"))
                         evidenceValue = "unknown";
                     var evidence = { id: prop, choice_id: evidenceValue, initial: true };
                     evidences.push(evidence)
                 }

             }
         } catch (ex)
         {
             console.log('Initial Data Error - Continuing without initial data');
         }

        
        var age = 0;
        try {
            var dob = new Date(Date.parse(session.dialogData.data.dob));
            var currentDate = new Date();
            age = (new Date().valueOf() - new Date(Date.parse(session.dialogData.data.dob)).valueOf()) / (1000 * 60 * 60 * 24 * 365);
        }
        catch (e)
        {
            console.log('Date error - Defaulting to 25');
        }
        if (age <= 0) age = 25.0;
         var diagnosisRequestPayload = {
             age: age,
             sex: session.dialogData.data.gender,              
             evidence: evidences,
             extras: {
                 disable_groups : true
             }


         }
         this.args.data = diagnosisRequestPayload;
         session.userData["diagnosisRequestPayload"] = diagnosisRequestPayload;
         
        

           
         const res = await fetch(this.baseUrl + 'diagnosis', { method: 'POST', body: JSON.stringify(this.args.data), headers: this.args.headers });
         const json = await res.json();
         session.userData["diagnosisResponse"] = json;
         if (session.dialogData.data) {
                    session.dialogData.data["should_stop"] = false;
                    if (json.should_stop) session.dialogData.data["should_stop"] = json.should_stop;
                    if (json.conditions && json.conditions.length > 0) {
                        if (json.conditions[0].probability > .7) session.dialogData.data["should_stop"] = true;
                    }
                    session.dialogData.data["next_question"] = json.question.text;
                    session.dialogData.data["diagnosis_id"] = json.question.items[0].id;
                    session.dialogData.data["diagnosisResponse"] = json;
                 }
         console.log(json);

     }

     
     
     public async processDiagnosis(session) {

         var evidences = session.userData["diagnosisRequestPayload"];
         if (session.message.text == 'Yes')
             evidences.evidence.push({ id: session.dialogData.data["diagnosis_id"], choice_id: 'present' })
         else if (session.message.text == 'No')
             evidences.evidence.push({ id: session.dialogData.data["diagnosis_id"], choice_id: 'absent' })
         else if (session.message.text == 'Dont Know')
             evidences.evidence.push({ id: session.dialogData.data["diagnosis_id"], choice_id: 'unknown' })
         session.userData["diagnosisRequestPayload"] = evidences;

             
             const res1 = await fetch(this.baseUrl + 'diagnosis', { method: 'POST', body: JSON.stringify(evidences), headers: this.args.headers });
             const json1 = await res1.json();
             session.userData["diagnosisResponse"] = json1;
           
              if (session.dialogData.data) {
                  session.dialogData.data["should_stop"] = false;
                  if (json1.should_stop) session.dialogData.data["should_stop"] = json1.should_stop;
                  if (json1.conditions && json1.conditions.length > 0) {
                      if (json1.conditions[0].probability > .7) session.dialogData.data["should_stop"] = true;
                  }
                  if (!session.dialogData.data["should_stop"]) {
                     session.dialogData.data["next_question"] = json1.question.text;
                     session.dialogData.data["diagnosis_id"] = json1.question.items[0].id;
                 }
                 else
                 {
                     var conditions = "You may have the following conditions. Contact a medical doctor immediately. \n\n";
                     json1.conditions.forEach(condition => {
                         conditions += "**" + condition.common_name + "** with a probability of **" + Number((condition.probability * 100).toFixed(2)) + "** percenage. \n";

                     });
                     session.dialogData.data["conditions"] = conditions;
                    

                 }
                 session.dialogData.data["diagnosisResponse"] = json1;
              }
         
        
         
       

     }

}

