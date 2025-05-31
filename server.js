import {app} from "./app.js";
import mysql2 from "mysql2"
import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT || 3000;

const connection =mysql2.createConnection({
    host:process.env.host,
    user:process.env.user,
    password:process.env.password,
    database:process.env.db_name
});



connection.connect((error)=>{
    if(error){
        console.error("MYSQL CONNNECTION FAILD!!!",error.message);  
        return;
    }
    console.log("MYSQL CONNECTED");

})

app.listen(PORT,()=>{
    console.log(`server running on http://localhost:${process.env.PORT}`);
   })
 export default connection;