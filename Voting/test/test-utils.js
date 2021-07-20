module.exports = {
  hexToString: (hex) => {
    return web3.utils.hexToAscii(hex).replace(/\0/g, "");
  },
};
