import { MongoClient, Db } from "mongodb";
import * as mongoose from 'mongoose';


class DbClient {
    public db: Db;

    public async connect() {
        var option = {
            server: {
                socketOptions: {
                    keepAlive: 300000,
                    connectTimeoutMS: 30000
                }
            },
            replset: {
                socketOptions: {
                    keepAlive: 300000,
                    connectTimeoutMS: 30000
                }
            }
        };
        var options = {
            useMongoClient: true,
            reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
            reconnectInterval: 500, // Reconnect every 500ms
        };
        try {
            // this.db = await mongoose.connect(process.env.MONGODB_PROVIDER_PROD, options);
            this.db = await mongoose.connect(process.env.MONGODB_PROVIDER_DEV, options);

            console.log("Connected to db");
           // console.log(this.db)
            return this.db;
        }
        catch (error) {
            console.log(error);
        }
    }
}
export = new DbClient();
