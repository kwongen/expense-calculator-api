// Getting command arguments
let forceUpdate = false;

if(process.argv.length >= 3) {
    if(process.argv[2] === "-f" || process.argv[2] === "force")
        forceUpdate=true;
    if(process.argv[2] === "-h" || process.argv[2] === "help") {
        console.log("update once a day: node updateExRate.js");
        console.log("force to update: node updateExRate.js -f");
        console.log("this help: node updateExRate.js -h");
        process.exit(1);
    }
}

require('dotenv').config()

// Connect to database server
const DBConnection = require("./db/mongodb/DBConnection");
DBConnection(process.env.MONGO_DB_URL);

// updating exchange rate of system currencies
const { fetchExRate } = require("./util/ExRateUpdater");
fetchExRate(forceUpdate)
.then(()=> {
    console.log("finish...");
    process.exit(1);
})
