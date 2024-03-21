require('dotenv').config()

const mongoose = require("mongoose");

const { SysCurrency }  = require("../db/mongodb/DBSchema");

// const exrate = {
//     "result": "success",
//     "documentation": "https://www.exchangerate-api.com/docs",
//     "terms_of_use": "https://www.exchangerate-api.com/terms",
//     "time_last_update_unix": 1709942401,
//     "time_last_update_utc": "Sat, 09 Mar 2024 00:00:01 +0000",
//     "time_next_update_unix": 1710028801,
//     "time_next_update_utc": "Sun, 10 Mar 2024 00:00:01 +0000",
//     "base_code": "USD",
//     "conversion_rates": {
//         "USD": 1,
//         "AED": 3.6725,
//         "AFN": 71.4999,
//         "ALL": 95.3414,
//         "EUR": 0.9142,
//         "FOK": 6.8149,
//         "GBP": 0.7785,
//         "GEL": 2.6567,
//         "GGP": 0.7785,
//         "GHS": 12.9649,
//         "GIP": 0.7785,
//         "GMD": 64.9834,
//         "GNF": 8585.4861,
//         "GTQ": 7.8121,
//         "GYD": 209.4435,
//         "HKD": 7.8208,
//         "HNL": 24.7058,
//         "HRK": 6.8878,
//         "JPY": 147.1449,
//         "KES": 142.5966,
//         "KGS": 89.5160,
//     }
// };

const isSameDate = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
}

const fetchExRate = async (forceUpdate=false) => {
    const currency = await SysCurrency.find();
    const allCodes = currency.map((c) => c._id);

    for(let i=0; i<currency.length; i++) {
        if(forceUpdate || !isSameDate(new Date(currency[i].exrateUpdatedAt), new Date())) {
            const apiURL = process.env.EXCHANGERATE_API_URL + currency[i]._id;
            const result = await fetch(apiURL);
            const exrate = await result.json();
            const filteredExRate = Object.fromEntries(
                Object.entries(exrate.conversion_rates).filter(
                ([key, val])=>allCodes.includes(key)
                )
            );

            currency[i].exrate = filteredExRate;
            currency[i].exrateUpdatedAt = new Date();
            currency[i].save();
            console.log("Updated exchange rate of currency: ", currency[i]._id)
        }
    }

    console.log("All exchange Rate are up-to-date.")
}

const dailyUpdateExRate = () => {
    fetchExRate();
    setInterval(() => fetchExRate(), 86400000) // update everyday     
}

module.exports = {
    fetchExRate : fetchExRate,
    dailyUpdateExRate : dailyUpdateExRate,
}