/*!
 * psbt/output.js - output for PSBT.
 * Copyright (c) 2018, The Bcoin Developers (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const {Struct} = require('bufio');
const inspect = require('util').inspect.custom;

class PSBTOutput extends Struct {
  constructor(options) {
    super();
  }

  getSize() {
    return 0;
  }

  write(bw, extra) {
    return bw;
  }

  read(br, extra) {
    console.log('reading...');
    return this;
  }

  [inspect]() {
    return this.inspect();
  }
}

module.exports = PSBTOutput;
