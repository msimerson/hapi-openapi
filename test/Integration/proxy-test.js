const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const { clone } = require('@hapi/hoek');
const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

describe('proxies', () => {
  const requestOptions = {
    method: 'GET',
    url: '/swagger.json',
    headers: {
      host: 'hostyhost:12345',
      referrer: 'http://localhost'
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

  it('basePath option', async () => {
    const options = {
      basePath: '/v2'
    };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.basePath, options.basePath);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('schemes and host options', async () => {
    const options = {
      schemes: ['https'],
      host: 'testhost'
    };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.host, options.host);
    assert.deepStrictEqual(response.result.schemes, options.schemes);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('referrer vs host and port', async () => {
    const options = {};

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.host, new URL(requestOptions.headers.referrer).host);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
    const clonedOptions = clone(requestOptions);
    delete clonedOptions.headers.referrer;
    const response2 = await server.inject(clonedOptions);
    assert.deepStrictEqual(response2.result.host, requestOptions.headers.host);
    assert.strictEqual(await Validate.test(response2.result), true);
  });

  it('x-forwarded options', async () => {
    const options = {};

    requestOptions.headers = {
      'x-forwarded-host': 'proxyhost',
      'x-forwarded-proto': 'https'
    };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.host, requestOptions.headers['x-forwarded-host']);
    assert.deepStrictEqual(response.result.schemes, ['https']);
  });

  it('x-forwarded options', async () => {
    const options = {};

    requestOptions.headers = {
      'x-forwarded-host': 'proxyhost',
      'x-forwarded-proto': 'https'
    };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.host, requestOptions.headers['x-forwarded-host']);
    assert.deepStrictEqual(response.result.schemes, ['https']);
  });

  it('multi-hop x-forwarded options', async () => {
    const options = {};

    requestOptions.headers = {
      'x-forwarded-host': 'proxyhost,internalproxy',
      'x-forwarded-proto': 'https,http'
    };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.host, 'proxyhost');
    assert.deepStrictEqual(response.result.schemes, ['https']);
  });

  it('Azure Web Sites options', async () => {
    const options = {};

    requestOptions.headers = {
      'x-arr-ssl': 'information about the SSL server certificate',
      'disguised-host': 'requested-host',
      host: 'internal-host'
    };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.host, requestOptions.headers['disguised-host']);
    assert.deepStrictEqual(response.result.schemes, ['https']);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('iisnode options', async () => {
    const serverOptions = {
      port: '\\\\.\\pipe\\GUID-expected-here'
    };

    const options = {};

    requestOptions.headers = {
      'disguised-host': 'requested-host',
      host: 'internal-host'
    };

    const server = await Helper.createServer(options, routes, serverOptions);
    const response = await server.inject(requestOptions);

    // Stop because otherwise consecutive test runs would error
    // with EADDRINUSE.
    await server.stop();

    assert.deepStrictEqual(response.result.host, requestOptions.headers['disguised-host']);
    assert.deepStrictEqual(response.result.schemes, ['http']);
  });

  it('adding facade for proxy using route options 1', async () => {
    const routes = {
      method: 'POST',
      path: '/tools/microformats/',
      options: {
        tags: ['api'],
        plugins: {
          '@msimerson/hapi-openapi': {
            nickname: 'microformatsapi',
            validate: {
              payload: Joi.object({
                a: Joi.number().required().description('the first number'),
                b: Joi.number().required().description('the first number')
              }),
              query: Joi.object({
                testquery: Joi.string()
              }),
              params: Joi.object({
                testparam: Joi.string()
              }),
              headers: Joi.object({
                testheaders: Joi.string()
              })
            }
          }
        },
        handler: {
          proxy: {
            host: 'glennjones.net',
            protocol: 'http',
            onResponse: Helper.replyWithJSON
          }
        }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject(requestOptions);

    assert.deepStrictEqual(response.result.paths['/tools/microformats/'].post.parameters, [
      {
        type: 'string',
        in: 'header',
        name: 'testheaders'
      },
      {
        type: 'string',
        in: 'path',
        name: 'testparam'
      },
      {
        type: 'string',
        in: 'query',
        name: 'testquery'
      },
      {
        in: 'body',
        name: 'body',
        schema: {
          $ref: '#/definitions/Model1'
        }
      }
    ]);
  });

  it('adding facade for proxy using route options 2 - naming', async () => {
    const routes = {
      method: 'POST',
      path: '/tools/microformats/',
      options: {
        tags: ['api'],
        plugins: {
          '@msimerson/hapi-openapi': {
            id: 'microformatsapi',
            validate: {
              payload: Joi.object({
                a: Joi.number().required().description('the first number')
              }).label('testname')
            }
          }
        },
        handler: {
          proxy: {
            host: 'glennjones.net',
            protocol: 'http',
            onResponse: Helper.replyWithJSON
          }
        }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject(requestOptions);

    assert.deepStrictEqual(response.result.paths['/tools/microformats/'].post.parameters, [
      {
        in: 'body',
        name: 'body',
        schema: {
          $ref: '#/definitions/testname'
        }
      }
    ]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('adding facade for proxy using route options 3 - defination reuse', async () => {
    const routes = [
      {
        method: 'POST',
        path: '/tools/microformats/1',
        options: {
          tags: ['api'],
          plugins: {
            '@msimerson/hapi-openapi': {
              id: 'microformatsapi1',
              validate: {
                payload: Joi.object({
                  a: Joi.number().required().description('the first number')
                }).label('testname')
              }
            }
          },
          handler: {
            proxy: {
              host: 'glennjones.net',
              protocol: 'http',
              onResponse: Helper.replyWithJSON
            }
          }
        }
      },
      {
        method: 'POST',
        path: '/tools/microformats/2',
        options: {
          tags: ['api'],
          plugins: {
            '@msimerson/hapi-openapi': {
              id: 'microformatsapi2',
              validate: {
                payload: Joi.object({
                  a: Joi.number().required().description('the first number')
                }).label('testname')
              }
            }
          },
          handler: {
            proxy: {
              host: 'glennjones.net',
              protocol: 'http',
              onResponse: Helper.replyWithJSON
            }
          }
        }
      }
    ];

    const server = await Helper.createServer({}, routes);
    const response = await server.inject(requestOptions);

    assert.deepStrictEqual(response.result.definitions, {
      testname: {
        properties: {
          a: {
            type: 'number',
            description: 'the first number'
          }
        },
        required: ['a'],
        type: 'object'
      }
    });
  });

  it('adding facade for proxy using route options 4 - defination name clash', async () => {
    const routes = [
      {
        method: 'POST',
        path: '/tools/microformats/1',
        options: {
          tags: ['api'],
          plugins: {
            '@msimerson/hapi-openapi': {
              id: 'microformatsapi1',
              validate: {
                payload: Joi.object({
                  a: Joi.number().required().description('the first number')
                }).label('testname')
              }
            }
          },
          handler: {
            proxy: {
              host: 'glennjones.net',
              protocol: 'http',
              onResponse: Helper.replyWithJSON
            }
          }
        }
      },
      {
        method: 'POST',
        path: '/tools/microformats/2',
        options: {
          tags: ['api'],
          plugins: {
            '@msimerson/hapi-openapi': {
              id: 'microformatsapi2',
              validate: {
                payload: Joi.object({
                  b: Joi.string().description('the string')
                }).label('testname')
              }
            }
          },
          handler: {
            proxy: {
              host: 'glennjones.net',
              protocol: 'http',
              onResponse: Helper.replyWithJSON
            }
          }
        }
      }
    ];

    const server = await Helper.createServer({}, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.definitions, {
      testname: {
        properties: {
          a: {
            type: 'number',
            description: 'the first number'
          }
        },
        required: ['a'],
        type: 'object'
      },
      Model1: {
        properties: {
          b: {
            type: 'string',
            description: 'the string'
          }
        },
        type: 'object'
      }
    });
  });
});
