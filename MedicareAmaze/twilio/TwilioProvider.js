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
const twilio_1 = require("twilio");
class TwilioProvider {
    constructor() {
        this.accountSid = process.env.twilio_sid;
        this.authToken = process.env.twilio_token;
    }
    voiceCallVerificationCode(mobileNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                var result = false;
                const client = new twilio_1.Twilio(this.accountSid, this.authToken);
                const MODERATOR = '';
                console.log(`Twilio Call: ${mobileNumber}`);
                var formatResponse = yield client.lookups.phoneNumbers(mobileNumber).fetch();
                var phone_number = formatResponse.phoneNumber;
                if (phone_number) {
                    var response = yield client.calls
                        .create({
                        url: 'http://demo.twilio.com/docs/voice.xml',
                        to: phone_number,
                        from: process.env.twilio_number
                    });
                }
            }
            catch (e) {
                //this will eventually be handled by your error handling middleware
            }
        });
    }
    smsCallVerificationCode(mobileNumber, mobiletoken, agency) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                var result = false;
                const client = new twilio_1.Twilio(this.accountSid, this.authToken);
                const MODERATOR = '';
                var formatResponse = yield client.lookups.phoneNumbers(mobileNumber).fetch();
                var phone_number = formatResponse.phoneNumber;
                console.log(`Twilio SMS: ${phone_number}`);
                if (phone_number) {
                    var response = yield client.messages
                        .create({
                        body: mobiletoken + ' - is the verification code from ' + agency,
                        from: process.env.twilio_number,
                        to: phone_number
                    });
                    if (response.status == 'failed' || response.status == 'undelivered')
                        return false;
                    else
                        return true;
                }
            }
            catch (e) {
                //this will eventually be handled by your error handling middleware
                return false;
            }
        });
    }
}
exports.default = TwilioProvider;
//# sourceMappingURL=TwilioProvider.js.map