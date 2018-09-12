/*!
 * psbt/path.js - path for PSBT.
 * Copyright (c) 2018, The Bcoin Developers (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const assert = require('assert');
const {Struct} = require('bufio');
const inspect = require('util').inspect.custom;
const HDCommon = require('../hd/common');

/**
 * Path utility class
 * @alias module:PSBT.Path
 * @property {Number[]} parts
 */

class Path extends Struct {
  constructor(options) {
    super();

    this.masterFingerPrint = 0;
    this.indexes = [];

    if (options)
      this.fromOptions(options);
  }

  /**
   * Inject options into path object.
   * @param {Object} options
   * @returns {Path}
   */

  fromOptions(options) {
    assert(typeof options === 'object',
      'Can not use non-object options.');

    if (options.indexes != null) {
      assert(Array.isArray(options.indexes),
        'Indexes must be an array of integers.'
      );
      this.indexes = options.indexes;
    }

    if (options.masterFingerPrint != null) {
      assert(options.masterFingerPrint >>> 0 === options.masterFingerPrint,
        'masterFingerPrint must be uint32.'
      );
      this.masterFingerPrint = options.masterFingerPrint;
    }

    return this;
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return 4 + this.indexes.length * 4;
  }

  /**
   * Serialize indexes to buffer.
   * @param {bufio.BufferWriter} bw
   * @returns {bufio.BufferWriter}
   */

  write(bw) {
    bw.writeU32BE(this.masterFingerPrint);

    for (const index of this.indexes)
      bw.writeU32(index);

    return bw;
  }

  /**
   * Read indexes from buffer reader
   * @param {bufio.BufferReader} br
   * @returns {Path}
   */

  read(br) {
    this.indexes = [];

    this.masterFingerPrint = br.readU32BE();

    while (br.left())
      this.indexes.push(br.readU32());

    return this;
  }

  /**
   * Gets string representation of indexes.
   * @returns {String}
   */

  toPath() {
    return HDCommon.toPath(this.indexes);
  }

  /**
   * Inject string path to indexes.
   * @param {String} path
   * @param {Number?} fingerPrint
   * @returns {Path}
   */

  fromPath(path, fingerPrint = this.masterFingerPrint) {
    this.indexes = HDCommon.parsePath(path, true);
    this.masterFingerPrint = fingerPrint;
    return this;
  }

  /**
   * Inject string path to indexes.
   * @param {String} path
   * @param {Number?} fingerPrint
   * @returns {Path}
   */

  fromString(path, fingerPrint) {
    return this.fromPath(path, fingerPrint);
  }

  /**
   * Gets string representation of indexes.
   * @return {String}
   */

  toString() {
    return this.toPath();
  }

  /**
   * Get duplicate array of indexes
   * @returns {Number[]}
   */

  toIndexes() {
    return this.indexes.slice();
  }

  /**
   * Inject indexes array
   * @param {Numbers[]} indexes
   * @param {Number} fingerPrint
   * @returns {Path}
   */

  fromIndexes(indexes, fingerPrint = this.fingerPrint) {
    assert(Array.isArray(indexes), 'Can not use non-array indexes.');
    this.indexes = indexes.slice();
    this.masterFingerPrint = fingerPrint;
    return this;
  }

  /**
   * Inspect path
   * @returns {String}
   */

  inspect() {
    return '<Path:'
      + ` path=${this.toPath()}`
      + ` masterFingerPrint=${this.masterFingerPrint}`
      + '>';
  }

  /**
   * Inspect path
   * @returns {String}
   */

  [inspect]() {
    return this.inspect();
  }

  /**
   * Create Path from path string.
   * @param {String} path
   * @returns {Path}
   */

  static fromPath(path, fingerPrint) {
    return new this().fromPath(path, fingerPrint);
  }

  /**
   * Inject indexes array
   * @param {Numbers[]} indexes
   * @param {Number} fingerPrint
   * @returns {Path}
   */

  static fromIndexes(indexes, fingerPrint) {
    return new this().fromIndexes(indexes, fingerPrint);
  }
}

module.exports = Path;
