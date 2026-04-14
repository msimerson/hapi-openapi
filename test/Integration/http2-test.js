const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Helper = require('../helper.js');
const Validate = require('../../lib/validate.js');
const Http2 = require('http2');
const Fs = require('fs').promises;
const Path = require('path');

describe('http2', () => {
  const requestOptions = {
    method: 'GET',
    url: '/swagger.json',
    headers: {
      referrer: 'https://localhost:12345'
    }
  };

  const routes = {
    method: 'GET',
    path: '/test',
    handler: Helper.defaultHandler,
    options: {
      tags: ['api']
    }
  };

  it('gets correct host', async () => {
    const [key, cert] = await Promise.all([
      await Fs.readFile(Path.join(__dirname, '../certs/server.key')),
      await Fs.readFile(Path.join(__dirname, '../certs/server.crt'))
    ]);
    const tls = {
      key,
      cert
    };
    const url = new URL(requestOptions.headers.referrer);
    const options = {
      tls,
      listener: Http2.createSecureServer({ ...tls }),
      port: url.port
    };
    const server = await Helper.createServer({}, routes, options);
    const response = await server.inject({ ...requestOptions });
    assert.deepStrictEqual(response.result.host, new URL(requestOptions.headers.referrer).host);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });
});
