'use strict';

const jwt = require('jwt-simple'),
      moment = require('moment'),
      tokenSecret = 'trycatch';

function encode(toEncode) {
  return jwt.encode(toEncode, tokenSecret);
}

function decode(toDecode) {
  return jwt.decode(toDecode, tokenSecret);
}

module.exports = {
  encode: encode,
  decode: decode
};
