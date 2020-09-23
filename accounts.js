const fs = require("fs");
const Web3 = require("web3");
const addresses = require("./excludedUNIAddresses.json");
let excludeAddresses = require("./excludedAddresses.json");
const FILE_NAME = "MEW/accounts.txt";
excludeAddresses = excludeAddresses.map((address) =>
  Web3.utils.toChecksumAddress(address)
);
fs.writeFileSync(FILE_NAME, "");
for (let address of addresses) {
  if (excludeAddresses.indexOf(address) > -1) continue;
  console.log(address);
  fs.appendFile(FILE_NAME, `${address}\n`, (err) => {
    if (err) {
      console.log(err);
    }
  });
}
