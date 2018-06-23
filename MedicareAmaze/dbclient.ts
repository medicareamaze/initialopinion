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
            // this.db = await MongoClient.connect("mongodb://main_admin:Vijay123@mongod-0.mongodb-service,mongod-1.mongodb-service,mongod-2.mongodb-service:27017/MedicareAmaze?replicaSet=MainRepSet&authSource=admin", option);
            this.db = await mongoose.connect("mongodb://main_admin:Vijay123@mongod-0.mongodb-service,mongod-1.mongodb-service,mongod-2.mongodb-service:27017/MedicareAmaze?replicaSet=MainRepSet&authSource=admin", options);
           // this.db = await mongoose.connect("mongodb://localhost:27017/Medicanja", options);

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