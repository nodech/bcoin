/*!
 * psbt/common.js - common constants and methods for PSBT.
 * Copyright (c) 2018, The Bcoin Developers (MIT License).
 * https://github.com/bcoin-org/bcoin
 */
'use strict';

/*
 * Constants
 */

/**
 * PSBT Magic number
 * 'p', 's', 'b', 't'
 * @const
 */

exports.MAGIC = 0x70736274;

/**
 * PSBT Magic Separator
 * @const
 */

exports.MAGIC_SEP = 0xff;

/**
 * PSBT Separator.
 * @const {Number}
 * @default
 */

exports.SEPARATOR = 0x00;

/**
 * PSBT Global types.
 * @enum {Number}
 */

exports.globalTypes = {
  UNSIGNED_TX: 0x00
};

/**
 * PSBT Global types by val.
 * @const {Object}
 */

exports.globalTypesByVal = [
  'UNSIGNED_TX'
];

/**
 * PSBT input types.
 * @enum {Number}
 */

exports.inputTypes = {
  NON_WITNESS_UTXO: 0x00,
  WITNESS_UTXO: 0x01,
  PARTIAL_SIG: 0x02,
  SIGHASH: 0x03,
  REDEEMSCRIPT: 0x04,
  WITNESSSCRIPT: 0x05,
  BIP32_DERIVATION: 0x06,
  SCRIPTSIG: 0x07,
  SCRIPTWITNESS: 0x08
};

/**
 * PSBT input types by val.
 * @const {Object}
 */

exports.inputTypesByVal = [
  'NON_WITNESS_UTXO',
  'WITNESS_UTXO',
  'PARTIAL_SIG',
  'SIGHASH',
  'REDEEMSCRIPT',
  'WITNESSSCRIPT',
  'BIP32_DERIVATION',
  'SCRIPTSIG',
  'SCRIPTWITNESS'
];

/**
 * PSBT output types.
 * @enum {Number}
 */

exports.outputTypes = {
  REDEEMSCRIPT: 0x00,
  WITNESSSCRIPT: 0x01,
  BIP32_DERIVATION: 0x02
};

/**
 * PSBT output types by val.
 * @const {Object}
 */

exports.outputTypesByVal = [
  'REDEEMSCRIPT',
  'WITNESSSCRIPT',
  'BIP32_DERIVATION'
];
