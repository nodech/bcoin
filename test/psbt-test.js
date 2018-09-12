/* eslint-env mocha */
/* eslint prefer-arrow-callback: "off" */

'use strict';

const assert = require('./util/assert');
const bufio = require('bufio');
const {PSBT, Path} = require('../lib/psbt');

const miscVectors = require('./data/psbt-misc.json');
const vectors = require('./data/psbt.json');

describe('PSBT', function() {
  for (const invalid of vectors.invalid) {
    it('should handle invalid PSBT', () => {
      let err;

      try {
        PSBT.fromBase64(invalid);
      } catch (e) {
        err = e;
      }

      assert(err, 'Error not found.');
    });
  }

  for (const valid of vectors.valid) {
    it('should handle valid PSBT', () => {
      const raw = Buffer.from(valid, 'base64');
      const psbt = PSBT.fromBase64(valid);
      const psbt1 = PSBT.fromRaw(psbt.toRaw());

      assert(psbt);
      try {
        assert.bufferEqual(psbt1.toRaw(), psbt.toRaw());
      } catch (e) {
        console.log(psbt);
        console.log(psbt1);
        return;
      }

      assert.bufferEqual(psbt.toRaw(), raw);
      assert.strictEqual(psbt.toBase64(), valid);
    });
  }

  describe('Path', () => {
    for (const test of miscVectors.pathVectors) {
      const rawFingerPrint = Buffer.from(test.fingerPrint, 'hex');
      const raw = Buffer.from(test.rawPath, 'hex');
      const fingerPrint = bufio.readU32BE(rawFingerPrint, 0);

      it(`should parse string path for ${test.name}`, () => {
        const path = Path.fromString(test.path, fingerPrint);

        assert.strictEqual(path.toPath(), test.path);
        assert.deepStrictEqual(path.indexes, test.indexes);
        assert.bufferEqual(path.toRaw(), raw);
      });

      it(`should construct path from indexes for ${test.name}`, () => {
        const path = Path.fromIndexes(test.indexes, fingerPrint);

        assert.strictEqual(path.toPath(), test.path);
        assert.deepStrictEqual(path.indexes, test.indexes);
        assert.bufferEqual(path.toRaw(), raw);
      });

      it(`should deserialize path for ${test.name}`, () => {
        const path = Path.fromRaw(raw);

        assert.strictEqual(path.toPath(), test.path);
        assert.deepStrictEqual(path.indexes, test.indexes);
        assert.bufferEqual(path.toRaw(), raw);
      });
    }
  });
});
