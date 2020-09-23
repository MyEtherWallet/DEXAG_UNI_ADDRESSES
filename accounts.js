const fs = require('fs');
const addresses = require('./excludedUNIAddresses.json');

console.log(addresses)

for (let address of addresses) {
    console.log(address)
    fs.appendFile('accounts.txt', `${address}\n`, (err) => {
        if (err) {
            console.log(err)
        }
    })
}
