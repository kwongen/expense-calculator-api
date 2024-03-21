const pingApiServer = async () => {

  const ping = async () => {
    console.log("pinging the api server at:", new Date());
    const resp =await fetch("https://api.expensecalculator.co.uk/api/ping", {
        signal: AbortSignal.timeout(200000),
      });
    if(resp.ok)
      console.log("finish pinging at:", new Date());
    else {
      console.log("failed to ping with status code:", resp.status)
    }
  }

  ping(); // perform first ping
  setInterval(() => ping(), 840000) // ping in every 14 min 
}

module.exports = {
  pingApiServer : pingApiServer
}
