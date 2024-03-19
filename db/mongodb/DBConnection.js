const mongoose = require("mongoose");

const DBConnection = (db_url) => {
    mongoose.connect(db_url).then(()=> {
        console.log("MongoDB is connected");
    }).catch((err)=>{
        console.log(err);
    })
};

module.exports = DBConnection;