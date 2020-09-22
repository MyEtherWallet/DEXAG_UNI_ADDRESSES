require('dotenv').config();
const Web3 = require("web3");
const axios = require("axios");
const fs = require('fs').promises
const UniswapConstants = require("./abis/uniswap.js");
const DexTradingAbi = require("./abis/DexTrading.json");
const DexTradingOldAbi = require("./abis/DexTradingOld.json");

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

  await fs.writeFile('./excludedUNIAddresses.json', JSON.stringify(prunedTraders), {});
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
  let uniqueTraders = [];

  for (let dexag of dexagAddresses) {
    let dexagTrading = new web3.eth.Contract(DexTradingAbi, dexag);
    let events = await dexagTrading.getPastEvents("Trade", {
      fromBlock: 8620106, // oldest contract deployment block
    });
    for (let event of events) {
      let uniswap = false;

      for (let exchange of event.returnValues.exchanges) {
        if (
          uniswapExchanges.indexOf(web3.utils.toChecksumAddress(exchange) >= 0)
        ) {
          uniswap = true;
          break;
        }

        if (web3.utils.toChecksumAddress(exchange) === UniswapV2Router) {
          uniswap = true;
          break;
        }
      }

      if (
        uniswap &&
        uniqueTraders.indexOf(
          web3.utils.toChecksumAddress(event.returnValues.trader)
        ) < 0
      ) {
        uniqueTraders.push(
          web3.utils.toChecksumAddress(event.returnValues.trader)
        );
      }
    }
  }

  for (let dexag of dexagOldAddresses) {
    let dexagTrading = new web3.eth.Contract(DexTradingOldAbi, dexag);
    let events = await dexagTrading.getPastEvents("Trade", {
      fromBlock: 8620106, // oldest contract deployment block
    });
    for (let event of events) {
      let uniswap = false;

      for (let exchange of event.returnValues.exchanges) {
        if (
          uniswapExchanges.indexOf(web3.utils.toChecksumAddress(exchange) >= 0)
        ) {
          uniswap = true;
          break;
        }

        if (web3.utils.toChecksumAddress(exchange) === UniswapV2Router) {
          uniswap = true;
          break;
        }
      }

      if (
        uniswap &&
        uniqueTraders.indexOf(
          web3.utils.toChecksumAddress(event.returnValues.trader)
        ) < 0
      ) {
        uniqueTraders.push(
          web3.utils.toChecksumAddress(event.returnValues.trader)
        );
      }
    }
  }

  console.log(
    `# Unique Dexag traders that used Uniswap: ${uniqueTraders.length}`
  );
  return uniqueTraders;
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
  console.log(`# Dexag Traders excluded from UNI Drop: ${prunedTraders.length}`);
  return prunedTraders
}

start();
