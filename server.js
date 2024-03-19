require('dotenv').config()

const express = require('express');

const https = require('https');
const http = require('http');

// const dotenv = require("dotenv");
const fs = require('fs');
const path = require('path');
const cookieParser = require("cookie-parser");
const cors = require('cors');

const DBConnection = require("./db/mongodb/DBConnection");
const MainRouter = require("./routers/MainRouter")

// const env = dotenv.config();

const app = express();
const SERVER_PORT  = process.env.SERVER_PORT || 5000 ;

// Connect to database server
DBConnection(process.env.MONGO_DB_URL);

// Retrieve JWT key pairs - You could use JWT private/public key options
// const keyFolderPath =  path.resolve(`${__dirname}/${process.env.JWT_KEY_PATH}`);
// global.JWT_PRIVATE_KEY = fs.readFileSync(`${keyFolderPath}/jwtRS256.key`, 'utf8');
// global.JWT_PUBLIC_KEY = fs.readFileSync(`${keyFolderPath}/jwtRS256.key.pub`, 'utf8');

// middlewares
 app.use(express.json());
 // Disabled urlencoded as mainly using JSON
 // app.use(express.urlencoded({extended: true}));

app.use(cookieParser());

const corsOptions = { 
    origin : process.env.CORS_SITE.split(","),
    credentials: true,
 } 
app.use(cors(corsOptions));

app.use("/api", MainRouter);

// Listen http or https port
if(process.env.SERVER_MODE === "HTTP") {
    const httpServer = http.createServer(app);

    httpServer.listen(SERVER_PORT, () => {
        console.log(`HTTP Server running on port ${SERVER_PORT}`);
    });

} 

if(process.env.SERVER_MODE === "HTTPS") {
    const httpsServer = https.createServer({
        key: fs.readFileSync('localhost-key.pem'),
        cert: fs.readFileSync('localhost.pem'),
    }, app);

    httpsServer.listen(SERVER_PORT, () => {
        console.log(`HTTPS Server running on port ${SERVER_PORT}`);
    });
}
