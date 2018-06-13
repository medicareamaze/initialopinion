
module.exports = (session, next) => {
    console.log('session.message-' + session.message.value)
    if (session.message && session.message.value) {
        var requiredFields = "";
        var flagRequiredFieldsPopulated = true;
        for (var prop in session.message.value) {
            if ((prop == 'dateOfBith' || prop == 'email' || prop == 'zip') && session.message.value[prop] == '')
            {
                flagRequiredFieldsPopulated = false;
                if (requiredFields != "") requiredFields += ","
                requiredFields += prop;
            }
            Object.defineProperty(session.userData, prop, {
                value: session.message.value[prop],
                writable: true,
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(session.dialogData.data, prop, {
                value: session.message.value[prop],
                writable: true,
                enumerable: true,
                configurable: true
            });
        }
       
        if (flagRequiredFieldsPopulated) {
            Object.defineProperty(session.dialogData.data, 'loginStatus', {
                value: 'success',
                writable: true,
                enumerable: true,
                configurable: true
            });
            return next(); 
           
          
        }
        else {
            Object.defineProperty(session.dialogData.data, 'loginStatus', {
                value: 'failure',
                writable: true,
                enumerable: true,
                configurable: true
            });
            session.send('Please enter the mandatory information - ' + requiredFields);
        }

        
           
    }

}