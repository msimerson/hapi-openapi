const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Builder = require('../../lib/builder.js');
const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

describe('dereference', () => {
  const routes = [
    {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            a: Joi.number(),
            b: Joi.number(),
            operator: Joi.string(),
            equals: Joi.number()
          })
        }
      }
    }
  ];

  it('flatten with no references', async () => {
    const server = await Helper.createServer({ deReference: true }, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters, [
      {
        in: 'body',
        name: 'body',
        schema: {
          properties: {
            a: {
              type: 'number'
            },
            b: {
              type: 'number'
            },
            operator: {
              type: 'string'
            },
            equals: {
              type: 'number'
            }
          },
          type: 'object'
        }
      }
    ]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('flatten with no references on OAS v3', async () => {
    const swaggerOptions = {
      deReference: true,
      OAS: 'v3.0',
      securityDefinitions: {
        jwt: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    };
    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.result.components, { securitySchemes: swaggerOptions.securityDefinitions });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/store/'].post.requestBody.content, {
      'application/json': {
        schema: {
          properties: {
            a: {
              type: 'number'
            },
            b: {
              type: 'number'
            },
            operator: {
              type: 'string'
            },
            equals: {
              type: 'number'
            }
          },
          type: 'object'
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('flatten with no references (OpenAPI)', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0', deReference: true }, routes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/store/'].post.requestBody, {
      content: {
        'application/json': {
          schema: {
            properties: {
              a: {
                type: 'number'
              },
              b: {
                type: 'number'
              },
              operator: {
                type: 'string'
              },
              equals: {
                type: 'number'
              }
            },
            type: 'object'
          }
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('dereferences error', async () => {
    try {
      await Builder.dereference(null);
    } catch (err) {
      assert.ok(err != null);
      assert.deepStrictEqual(err.message, 'failed to dereference schema');
    }
  });
});
