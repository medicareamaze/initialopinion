 module.exports = (session, next) => {
    console.log('session.message-' + session.message.value)
    if (session.message && session.message.value && session.message.value['medicareEnrollment']) {
        var requiredFields = "";
        var flagRequiredFieldsPopulated = true;
        for (var prop in session.message.value) {
            if ((prop == 'medicareEnrollment' ) && session.message.value[prop] == '') {
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
           
            return next();


        }
        else {
          
            session.send('Please enter the mandatory information - ' + requiredFields);
        }



    }

}