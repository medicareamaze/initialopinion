import { Twilio } from 'twilio';

export default class TwilioProvider{
    private accountSid: string = process.env.twilio_sid;
    private authToken: string = process.env.twilio_token; 
    public async voiceCallVerificationCode(mobileNumber)
    {
        try {

            var result: boolean = false;
           
            
            const client = new Twilio(this.accountSid, this.authToken); 
            const MODERATOR = '';
            
            console.log(`Twilio Call: ${mobileNumber}`);
            var formatResponse = await client.lookups.phoneNumbers(mobileNumber).fetch();
            var phone_number = formatResponse.phoneNumber;

            if (phone_number) {
              var response =   await  client.calls
                    .create({
                        url: 'http://demo.twilio.com/docs/voice.xml',
                        to: phone_number,
                        from: process.env.twilio_number
                    });
            }
        } catch (e) {
            //this will eventually be handled by your error handling middleware
            
        }

    }

    public async smsCallVerificationCode(mobileNumber, mobiletoken, agency )  {
        try {

            var result: boolean = false;

            const client = new Twilio(this.accountSid, this.authToken);
            const MODERATOR = '';
            var formatResponse = await client.lookups.phoneNumbers(mobileNumber).fetch();
            var phone_number = formatResponse.phoneNumber;

            console.log(`Twilio SMS: ${phone_number}`);
            if (phone_number) {
                var response = await client.messages
                    .create({
                        body: mobiletoken +' - is the verification code from '+ agency,
                        from: process.env.twilio_number,
                        to: phone_number
                    });
                if (response.status == 'failed' || response.status == 'undelivered')
                    return false;
                else
                    return true;
            }
        } catch (e) {
            //this will eventually be handled by your error handling middleware
            return false;

        }

    }

}