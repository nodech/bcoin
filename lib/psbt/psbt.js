'use strict';

const assert = require('assert');
const {Struct, sizeVarint} = require('bufio');
const inspect = require('util').inspect.custom;
const {BufferMap} = require('buffer-map');

const MTX = require('../primitives/mtx');
const common = require('./common');
const {globalTypes} = common;
const PSBTInput = require('./input');

/**
 * Partially Signed Bitcoin Transaction
 * @see https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
 * @property {PSBTInput[]} inputs
 * @property {PSBTOutput[]} outputs
 * @property {MTX} mtx
 * @property {Map} unknown
 */

class PSBT extends Struct {
  constructor(options) {
    super();

    this.inputs = [];
    this.outputs = [];
    this.unknown = new BufferMap();

    this.mtx = null;
  }

  getSize() {
    let size = 5; // prefix

    const mtxSize = this.mtx.getSize();

    // unsigned TX
    size += 2; // key
    size += sizeVarint(mtxSize);
    size += mtxSize;

    // calculate unknown types
    for (const [key, value] of this.unknown.entries()) {
      // key
      size += sizeVarint(key.length / 2);
      size += key.length / 2;

      // value
      size += sizeVarint(value.length);
      size += value.length;
    }

    size += 1; // psbt separator

    // inputs
    for (const input of this.inputs) {
      size += input.getSize();
      size += 1; // psbt separator
    }

    return size;
  }

  write(bw, extra) {
    bw.writeU32BE(common.MAGIC);
    bw.writeU8(common.MAGIC_SEP);

    assert(this.mtx, 'Can not serialize PSBT without unsigned TX.');
    const mtxSize = this.mtx.getSize();

    bw.writeVarint(1);
    bw.writeU8(globalTypes.UNSIGNED_TX);
    bw.writeVarint(mtxSize);
    this.mtx.toWriter(bw);

    for (const [key, value] of this.unknown.entries()) {
      bw.writeVarBytes(key, 'hex');
      bw.writeVarBytes(value);
    }

    bw.writeU8(common.SEPARATOR);
    // end of global scope.

    // input scope
    for (const input of this.inputs) {
      input.toWriter(bw);
      bw.writeU8(common.SEPARATOR);
    }

    return bw;
  }

  read(br, extra) {
    const magic = br.readU32BE();
    const magicSep = br.readU8();

    assert(magic === common.MAGIC && magicSep === common.MAGIC_SEP,
      'Invalid PSBT magic bytes.');

    while (br.left()) {
      const key = br.readVarBytes();

      // the key is empty if that was actually a separator byte.
      // This is a special case for key lengths 0 as those are not
      // allowed. (except for separator)
      if (key.length === 0)
        break;

      const type = key[0];

      switch (type) {
        case globalTypes.UNSIGNED_TX: {
          assert(!this.mtx, 'Duplicate Key, unsigned tx already provided.');

          const rawTX = br.readVarBytes();
          this.mtx = MTX.fromRaw(rawTX);

          assert(isTransactionUnsigned(this.mtx),
            'Unsigned tx does not have empty scriptSigs and scriptWitnesses.');
          break;
        }
        // Unknown stuff
        default: {
          assert(!this.unknown.has(key),
            'Duplicate Key, key for unknown value already provided.');

          const value = br.readVarBytes();
          this.unknown.set(key, value);
        }
      }
    }

    assert(this.mtx, 'No unsigned transcation was provided.');
    // end of global scope.

    for (let i = 0; i < this.mtx.inputs.length; i++) {
      const input = PSBTInput.fromReader(br);

      this.inputs.push(input);
    }

    return this;
  }

  [inspect]() {
    return this.inspect();
  }

  // API

  /**
   * Check if PSBT is null.
   * @returns {Boolean}
   */

  isNull() {
    return !this.mtx
      && this.inputs.length === 0
      && this.outputs.length === 0
      && this.unknown.size === 0;
  }

  /**
   * Check sanity of PSBT
   * @returns {Boolean}
   */

  isSane() {
    for (const input of this.inputs) {
      if (!input.isSane())
        return false;
    }
    return true;
  }

  /**
   * Merge PSBT with this object.
   * @param {PSBT} psbt
   * @return {PSBT}
   */

  merge(psbt) {
    for (const [i, input] of this.inputs.entries()) {
      assert(psbt.inputs[i]);
      input.merge(psbt.inputs[i]);
    }

    for (const [i, output] of this.outputs.entries()) {
      assert(psbt.outputs[i]);
      output.merge(psbt.outputs[i]);
    }
  }

  /**
   * Compare two PSBTs.
   * @param {PSBT} psbt
   * @returns {Boolean}
   */

  equals(psbt) {
    assert(this.mtx, 'Can not compare PSBT without MTX.');
    assert(psbt.mtx, 'Can not compare to PSBT without MTX.');

    return this.mtx.hash().equals(psbt.mtx.hash());
  }
}

function isTransactionUnsigned(mtx) {
  for (const input of mtx.inputs) {
    if (input.script.raw.length !== 0
      || input.witness.items.length !== 0)
      return false;
  }

  return true;
}

/*
 * Expose
 */

module.exports = PSBT;
