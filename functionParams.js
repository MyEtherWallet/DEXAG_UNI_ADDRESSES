const tradeOld = {
    parameters: [
        'address',
        'address',
        'uint256',
        'address[]',
        'address[]',
        'bytes',
        'uint256[]',
        'uint256[]',
        'uint256'
    ],
    exchangesIndex: 3
}

const trade = {
    parameters: [
        'address',
        'address',
        'uint256',
        'address[]',
        'address[]',
        'bytes',
        'uint256[]',
        'uint256[]',
        'uint256',
        'uint256'
    ],
    exchangesIndex: 3
}

const tradeAndSend = {
    parameters: [
        'address',
        'address',
        'address',
        'uint256',
        'address[]',
        'address[]',
        'bytes',
        'uint256[]',
        'uint256[]',
        'uint256',
        'uint256'
    ],
    exchangesIndex: 4
}

const sigsMap = {
    '0x821d3bae': tradeOld,
    '0x5d46ec34': trade,
    '0xef3f3d0b': tradeAndSend
}

module.exports = sigsMap;