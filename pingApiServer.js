const pingApiServer = async () => {

  const ping = async () => {
    console.log("pinging the api server at:", new Date());
    const resp = await fetch("https://api.expensecalculator.co.uk/api/auth/refresh-token", {
        signal: AbortSignal.timeout(200000),
      });
    console.log("finish at:", new Date());
    // const result = await resp.text();
    // console.log("result:", result)
  }

  ping();
  setInterval(() => ping(), 60000)
}

module.exports = {
  pingApiServer : pingApiServer
}

// setInterval(() => {
//     pingApiServer();
//   }, 840000)