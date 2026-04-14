const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const { clone } = require('@hapi/hoek');
const Helper = require('../helper.js');
const Validate = require('../../lib/validate.js');

describe('proxies (OpenAPI)', () => {
  const requestOptions = {
    method: 'GET',
    url: '/openapi.json',
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
      OAS: 'v3.0',
      basePath: '/v2'
    };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.servers, [{ url: 'http://localhost' + options.basePath }]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('servers option', async () => {
    const options = {
      OAS: 'v3.0',
      servers: [{ url: 'https://testhost' }]
    };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.servers, [{ url: 'https://testhost' }]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('referrer vs host and port', async () => {
    const options = { OAS: 'v3.0' };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.servers, [{ url: `${requestOptions.headers.referrer}/` }]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
    const clonedOptions = clone(requestOptions);
    delete clonedOptions.headers.referrer;
    const response2 = await server.inject(clonedOptions);
    assert.deepStrictEqual(response2.result.servers, [{ url: `http://${requestOptions.headers.host}` }]);
    assert.strictEqual(await Validate.test(response2.result), true);
  });

  it('x-forwarded options', async () => {
    const options = { OAS: 'v3.0' };

    requestOptions.headers = {
      'x-forwarded-host': 'proxyhost',
      'x-forwarded-proto': 'https'
    };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.servers, [
      { url: `https://${requestOptions.headers['x-forwarded-host']}/` }
    ]);
  });

  it('x-forwarded options', async () => {
    const options = { OAS: 'v3.0' };

    requestOptions.headers = {
      'x-forwarded-host': 'proxyhost',
      'x-forwarded-proto': 'https'
    };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.servers, [
      { url: `https://${requestOptions.headers['x-forwarded-host']}/` }
    ]);
  });

  it('multi-hop x-forwarded options', async () => {
    const options = { OAS: 'v3.0' };

    requestOptions.headers = {
      'x-forwarded-host': 'proxyhost,internalproxy',
      'x-forwarded-proto': 'https,http'
    };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.servers, [{ url: 'https://proxyhost/' }]);
  });

  it('Azure Web Sites options', async () => {
    const options = { OAS: 'v3.0' };

    requestOptions.headers = {
      'x-arr-ssl': 'information about the SSL server certificate',
      'disguised-host': 'requested-host',
      host: 'internal-host'
    };

    const server = await Helper.createServer(options, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.servers, [{ url: `https://${requestOptions.headers['disguised-host']}/` }]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('iisnode options', async () => {
    const serverOptions = {
      port: '\\\\.\\pipe\\GUID-expected-here'
    };

    const options = { OAS: 'v3.0' };

    requestOptions.headers = {
      'disguised-host': 'requested-host',
      host: 'internal-host'
    };

    const server = await Helper.createServer(options, routes, serverOptions);
    const response = await server.inject(requestOptions);

    // Stop because otherwise consecutive test runs would error
    // with EADDRINUSE.
    await server.stop();

    assert.deepStrictEqual(response.result.servers, [{ url: `http://${requestOptions.headers['disguised-host']}/` }]);
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

    const server = await Helper.createServer({ OAS: 'v3.0' }, routes);
    const response = await server.inject(requestOptions);

    assert.deepStrictEqual(response.result.paths['/tools/microformats/'].post.parameters, [
      {
        in: 'header',
        name: 'testheaders',
        schema: {
          type: 'string'
        }
      },
      {
        in: 'path',
        name: 'testparam',
        schema: {
          type: 'string'
        }
      },
      {
        in: 'query',
        name: 'testquery',
        schema: {
          type: 'string'
        }
      }
    ]);
    assert.deepStrictEqual(response.result.paths['/tools/microformats/'].post.requestBody, {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Model1'
          }
        }
      }
    });
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

    const server = await Helper.createServer({ OAS: 'v3.0' }, routes);
    const response = await server.inject(requestOptions);

    assert.deepStrictEqual(response.result.paths['/tools/microformats/'].post.requestBody, {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/testname'
          }
        }
      }
    });
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

    const server = await Helper.createServer({ OAS: 'v3.0' }, routes);
    const response = await server.inject(requestOptions);

    assert.deepStrictEqual(response.result.components.schemas, {
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

    const server = await Helper.createServer({ OAS: 'v3.0' }, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.components.schemas, {
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
