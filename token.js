'use strict';

const jwt = require('jwt-simple');
const moment = require('moment');

const tokenSecret = 'trycatch';

module.exports = {
  encode: encode,
  decode: decode
};

function encode(toEncode) {
  return jwt.encode(toEncode, tokenSecret);
}

function decode(toDecode) {
  return jwt.decode(toDecode, tokenSecret);
}

