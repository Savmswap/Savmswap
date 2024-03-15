require("@nomicfoundation/hardhat-toolbox");
require("hardhat-contract-sizer");
require("@nomicfoundation/hardhat-verify");
require('dotenv').config();

function mnemonic() {
  return [process.env.PRIVATE_KEY];
}

function mainMnemonic() {
  return [process.env.MAIN_PRIVATE_KEY]
}
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers:[
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 8888
          }
        }
      },
      {
        version: "0.4.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 8888
          }
        } 
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000
          }
        } 
      }
    ]
    
  },
  networks: {
    svm: {
      url: 'https://test-rpc-node-http.svmscan.io',
      accounts: mnemonic()
    },
    test: {
      url: 'https://eth-goerli.g.alchemy.com/v2/JRV7Xs-TqLcyYoZ2i3XeTfEMyy1MuWhM',
      accounts: mnemonic()
    },
    svm_test: {
      url: "https://test-rpc-node-http.svmscan.io",
      accounts: mnemonic()
    },
    satoshiVM: {
      url: 'https://alpha-rpc-node-http.svmscan.io',
      accounts: mainMnemonic()
    }
  },
  etherscan: {
    apiKey: {
      SatoshiVM: "DZA2PD1ES8GS4PRH6WEDEUC5F75TWCU98W", // Your Etherscan API key
    },
    customChains: [
      {
        network: "SatoshiVM",
        chainId: 3110,
        urls: {
          apiURL: "https://testnet.svmscan.io/api",
          browserURL: "https://testnet.svmscan.io"
        }
      }
    ]
  },
};
