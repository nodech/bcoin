/*!
 * psbt/input.js - input for PSBT.
 * Copyright (c) 2018, The Bcoin Developers (MIT License).
 * https://github.com/bcoin-org/bcoin
 */
'use strict';

const assert = require('assert');
const bufio = require('bufio');
const {sizeVarint, Struct} = bufio;
const inspect = require('util').inspect.custom;
const secp256k1 = require('bcrypto/lib/secp256k1');
const {BufferMap} = require('buffer-map');
const hash160 = require('bcrypto/lib/hash160');
const TX = require('../primitives/tx');
const Output = require('../primitives/output');
const {Script, Witness} = require('../script');
const common = require('./common');
const {inputTypes} = common;
const Path = require('./path');

class PSBTInput extends Struct {
  constructor(options) {
    super();

    // used for NON_WITNESS_UTXO
    this.tx = null;

    // used for WITNESS_UTXO
    this.output = null;

    // used for redeem script.
    this.redeem = null;

    // used for witness redeem script.
    this.redeemWitness = null;

    // final script for legacy
    this.script = null;

    // final script for witness
    this.witnessStack = null;

    this.hashType = 0;
    this.paths = new BufferMap();
    this.signatures = new BufferMap();
    this.unknown = new BufferMap();
  }

  getSize() {
    let size = 0;

    if (this.tx) {
      const txSize = this.tx.getSize();
      size += 2; // type / key
      size += sizeVarint(txSize) + txSize;
    } else if (this.output) {
      const outputSize = this.output.getSize();
      size += 2;
      size += sizeVarint(outputSize) + outputSize;
    }

    if (!this.script && !this.witnessStack) {
      for (const sigpair of this.signatures.values()) {
        const keySize = 1 + sigpair[0].length;

        size += sizeVarint(keySize) + keySize; // key
        size += sizeVarint(sigpair[1].length) + sigpair[1].length; // value
      }

      if (this.hashType > 0) {
        size += 2; // key
        size += 1 + 4; // value
      }
    }

    return size;
  }

  write(bw) {
    if (this.tx) {
      bw.writeVarint(1); // var size
      bw.writeU8(inputTypes.NON_WITNESS_UTXO);
      bw.writeVarBytes(this.tx.toRaw());
    } else if (this.output) {
      bw.writeVarint(1);
      bw.writeU8(inputTypes.WITNESS_UTXO);
      bw.writeVarBytes(this.output.toRaw());
    }

    if (!this.script && !this.witnessStack) {
      // write partial signatures
      for (const sigpair of this.signatures.values()) {
        // key
        bw.writeVarint(sigpair[0].length + 1);
        bw.writeU8(inputTypes.PARTIAL_SIG);
        bw.writeBytes(sigpair[0]);

        // value
        bw.writeVarBytes(sigpair[1]);
      }

      // write sighash type
      if (this.hashType > 0) {
        // key
        bw.writeVarint(1);
        bw.writeU8(inputTypes.SIGHASH);

        // value
        bw.writeVarint(4);
        bw.writeU32(this.hashType);
      }

      if (this.redeem) {
        // ...
      }
    }

    return bw;
  }

  read(br) {
    while (br.left()) {
      const key = br.readVarBytes();

      // separator byte.
      if (key.length === 0)
        break;

      const type = key[0];

      switch (type) {
        case inputTypes.NON_WITNESS_UTXO: {
          assert(!this.tx,
            'Duplicate Key, input non-witness utxo already provided.');
          const rawTX = br.readVarBytes();

          // we can store output index with PSBTInput
          // for simplicity. Can be passed down
          // in input parsing loop.
          this.tx = TX.fromRaw(rawTX);
          break;
        }
        case inputTypes.WITNESS_UTXO: {
          assert(!this.output,
            'Duplicate Key, input witness utxo already provided.'
          );

          const rawOutput = br.readVarBytes();

          this.output = Output.fromRaw(rawOutput);
          break;
        }
        case inputTypes.PARTIAL_SIG: {
          assert(key.length === 33 + 1 || key.length === 65 + 1,
            'Size of key was not the expected size for the type partial'
            + ' signature pubkey.');

          const pubkey = key.slice(1);
          assert(secp256k1.publicKeyVerify(pubkey), 'Invalid public key.');

          // we can store pubkeys as keys as well
          const hash = hash160.digest(pubkey);
          const signature = br.readVarBytes();

          this.signatures.set(hash, [pubkey, signature]);
          break;
        }
        case inputTypes.SIGHASH: {
          assert(this.hashType === 0,
            'Duplicate Key, input sighash type already provided.'
          );

          const hashType = br.readVarBytes();

          // verification does not happen here for now.
          this.hashType = bufio.readU32(hashType, 0);
          break;
        }
        case inputTypes.REDEEMSCRIPT: {
          assert(!this.redeem,
            'Duplicate Key, input redeemScript already provided.'
          );

          const rawScript = br.readVarBytes();

          this.redeem = Script.fromRaw(rawScript);
          break;
        }
        case inputTypes.WITNESSSCRIPT: {
          assert(!this.redeemWitness,
            'Duplicate Key, input witnessScript already provided.');

          const rawScript = br.readVarBytes();

          this.redeemWitness = Script.fromRaw(rawScript);
          break;
        }
        case inputTypes.BIP32_DERIVATION: {
          const pubkey = key.slice(1);

          assert(secp256k1.publicKeyVerify(pubkey), 'Invalid public key.');

          const hash = hash160.digest(pubkey);
          const path = Path.fromRaw(br.readVarBytes());

          this.paths.set(hash, path);
          break;
        }
        case inputTypes.SCRIPTSIG: {
          assert(!this.script,
            'Duplicate Key, input final scriptSig already provided.');

          const rawScript = br.readVarBytes();
          this.script = Script.fromRaw(rawScript);
          break;
        }
        case inputTypes.SCRIPTWITNESS: {
          assert(!this.witnessStack,
            'Duplicate Key, input final scriptWitness already provided.');

          const rawStack = br.readVarBytes();
          this.witnessStack = Witness.fromRaw(rawStack);
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
    return this;
  }

  [inspect]() {
    return this.inspect();
  }

  // API

  /**
   * Check if PSBTInput is null.
   * @returns {Boolean}
   */

  isNull() {
    return false;
  }

  /**
   * Get SignatureData object.
   * @returns {SignatureData}
   */

  getSignatureData() {
    return {};
  }

  /**
   * Inject SignatureData to PSBTInput.
   * @param {SignatureData} sigdata
   * @returns {PSBTInput}
   */

  fromSignatureData(sigdata) {
    return this;
  }

  /**
   * Merge with other PSBTInput.
   * @param {PSBTInput} input
   * @returns {PSBTInput}
   */

  merge(input) {
    return this;
  }

  /**
   * Verify validity..
   * @returns {Boolean}
   */

  isSane() {
    // Cannot have both witness and non-witness utxos
    if (this.tx && this.output)
      return false;

    // If we have a witness_script or script witness
    // we must also have a witness utxo
    if (this.redeemWitness && !this.output)
      return false;

    if (this.witnessStack && !this.output)
      return false;

    return true;
  }
}

module.exports = PSBTInput;
