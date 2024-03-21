const pingApiServer = async () => {

  const ping = async () => {
    console.log("pinging the api server at:", new Date());
    await fetch("https://api.expensecalculator.co.uk/api/auth/refresh-token", {
        signal: AbortSignal.timeout(200000),
      });
    console.log("finish at:", new Date());
  }

  ping(); // perform first ping
  setInterval(() => ping(), 840000) // ping in every 14 min 
}

module.exports = {
  pingApiServer : pingApiServer
}

// setInterval(() => {
//     pingApiServer();
//   }, 840000)