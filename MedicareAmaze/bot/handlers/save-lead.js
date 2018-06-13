
module.exports = (session, next) => {      
    if (session.message && session.message.value) {
       
        for (var prop in session.message.value) {
           
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
             console.log('session.message Key-' + prop)
             console.log('session.message Value-' + session.message.value[prop])
        }
        return next();
       
           
    }

}