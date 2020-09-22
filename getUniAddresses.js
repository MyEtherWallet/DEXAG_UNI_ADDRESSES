require("dotenv").config();
const Web3 = require("web3");
const axios = require("axios");
const fs = require("fs");
const fsPromise = fs.promises;
const parse = require("csv-parse");
const UniswapConstants = require("./abis/uniswap.js");
const DexTradingAbi = require("./abis/DexTrading.json");
const DexTradingOldAbi = require("./abis/DexTradingOld.json");
const sigsMap = require("./functionParams.js");

let web3 = new Web3(
  new Web3.providers.HttpProvider(
    `https://mainnet.infura.io/v3/${process.env.INFURA}`
  )
);

const UniswapV2Router = web3.utils.toChecksumAddress(
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
);

const dexagAddresses = [
  "0x745DAA146934B27e3f0b6bff1a6e36b9B90fb131",
  "0xA540fb50288cc31639305B1675c70763C334953b",
];
const dexagOldAddresses = ["0x932348DF588923bA3F1Fd50593B22C4e2A287919"];

async function start() {
  let uniswapExchanges = await getUniswapExchanges();

  let dexagTraders = await getDexagTraders(uniswapExchanges);

  let prunedTraders = await pruneMerkleClaims(dexagTraders);

  await fsPromise.writeFile(
    "./excludedUNIAddresses.json",
    JSON.stringify(prunedTraders),
    {}
  );
}

async function getUniswapExchanges() {
  const UniswapFactory = new web3.eth.Contract(
    UniswapConstants.FactoryABI,
    UniswapConstants.FactoryAddress
  );
  let events = await UniswapFactory.getPastEvents("NewExchange", {
    fromBlock: UniswapConstants.StartBlock,
  });
  console.log(`# Uniswap V1 Exchanges: ${events.length}`);
  return events.map((event) => {
    return web3.utils.toChecksumAddress(event.returnValues.exchange);
  });
}

async function getDexagTraders(uniswapExchanges) {
  let transactions = [];
  let uniqueTraders = [];

  return new Promise(async (resolve, reject) => {
    fs.createReadStream("./txs.csv")
      .pipe(parse({ delimiter: ":" }))
      .on("data", function (csvrow) {
        transactions.push(csvrow);
      })
      .on("end", function () {
        for (let i = 1; i < transactions.length; i++) {
          let transactionData = transactions[i][0].split(",");
          let address = transactionData[2];
          let data = transactionData[4];

          let sigType = sigsMap[data.substr(0, 10)];

          if (sigType) {
            let decodedData = web3.eth.abi.decodeParameters(
              sigType.parameters,
              data.substr(10)
            );

            let callAddresses = decodedData[sigType.exchangesIndex];

            for (let callAddress of callAddresses) {
              if (
                uniswapExchanges.indexOf(
                  web3.utils.toChecksumAddress(callAddress) >= 0
                ) ||
                web3.utils.toChecksumAddress(exchange) === UniswapV2Router
              ) {
                try {
                  if (
                    uniqueTraders.indexOf(
                      web3.utils.toChecksumAddress(address)
                    ) < 0
                  ) {
                    uniqueTraders.push(web3.utils.toChecksumAddress(address));
                  }
                } catch (error) {
                  console.log(
                    `Address formatting issue for ${transactionData[0]}: ${error}`
                  );
                }
              }
            }
          } else {
            console.log(
              `Error: no valid signature for tx: ${transactionData[0]}`
            );
          }
        }
        console.log(
          `# Unique Dexag traders that used Uniswap: ${uniqueTraders.length}`
        );
        resolve(uniqueTraders);
      });
  });
}

async function pruneMerkleClaims(dexagTraders) {
  const merkleBlob = await axios.get("https://mrkl.uniswap.org");

  const claims = merkleBlob.data.claims;

  const claimAddresses = Object.keys(claims).map((claim) => {
    return web3.utils.toChecksumAddress(claim);
  });

  const prunedTraders = [];

  for (let trader of dexagTraders) {
    if (claimAddresses.indexOf(trader) < 0) {
      prunedTraders.push(trader);
    }
  }
  console.log(
    `# Dexag Traders excluded from UNI Drop: ${prunedTraders.length}`
  );
  return prunedTraders;
}

start();
