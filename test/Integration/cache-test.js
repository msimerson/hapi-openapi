const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');

const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

describe('plugin', () => {
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

  it('basic cache', async () => {
    const swaggerOptions = {
      cache: {
        expiresIn: 24 * 60 * 60 * 1000
      }
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    await server.inject({ method: 'GET', url: '/swagger.json' });

    // double call to test '@hapi/code' paths as cache works
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('cache with generateTimeout', async () => {
    const swaggerOptions = {
      cache: {
        expiresIn: 24 * 60 * 60 * 1000,
        generateTimeout: 30 * 1000
      }
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('model cache using weakmap', async () => {
    // test if a joi object weakmap cache
    // the Joi object should only be parsed once

    const joiObj = Joi.object({
      a: Joi.number(),
      b: Joi.number(),
      operator: Joi.string(),
      equals: Joi.number()
    });

    const tempRoutes = [
      {
        method: 'POST',
        path: '/store1/',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api'],
          validate: {
            payload: joiObj
          }
        }
      },
      {
        method: 'POST',
        path: '/store2/',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api'],
          validate: {
            payload: joiObj
          }
        }
      }
    ];

    const server = await Helper.createServer({}, tempRoutes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });
});

describe('multiple plugins with cache', () => {
  const routes = [
    {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['store-api'],
        validate: {
          payload: Joi.object({
            a: Joi.number(),
            b: Joi.number(),
            operator: Joi.string(),
            equals: Joi.number()
          })
        }
      }
    },
    {
      method: 'POST',
      path: '/shop/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['shop-api'],
        validate: {
          payload: Joi.object({
            c: Joi.number(),
            d: Joi.number(),
            operator: Joi.string(),
            equals: Joi.number()
          })
        }
      }
    }
  ];

  it('basic cache multiple apis', async () => {
    const swaggerOptions1 = {
      routeTag: 'store-api',
      info: {
        description: 'This is the store API docs'
      },
      cache: {
        expiresIn: 24 * 60 * 60 * 1000
      }
    };
    const swaggerOptions2 = {
      routeTag: 'shop-api',
      info: {
        description: 'This is the shop API docs'
      },
      cache: {
        expiresIn: 24 * 60 * 60 * 1000
      }
    };
    const server = await Helper.createServerMultiple(swaggerOptions1, swaggerOptions2, routes);

    await server.inject({ method: 'GET', url: '/store-api/swagger.json' });
    await server.inject({ method: 'GET', url: '/shop-api/swagger.json' });

    // double call to test '@hapi/code' paths as cache works
    const response1 = await server.inject({ method: 'GET', url: '/store-api/swagger.json' });
    assert.deepStrictEqual(response1.statusCode, 200);
    const isValid1 = await Validate.test(response1.result);
    assert.strictEqual(isValid1, true);
    assert.deepStrictEqual(response1.result.info.description, 'This is the store API docs');
    assert.deepStrictEqual(response1.result.paths['/store/'].post.operationId, 'postStore');

    const response2 = await server.inject({ method: 'GET', url: '/shop-api/swagger.json' });
    assert.deepStrictEqual(response2.statusCode, 200);
    const isValid2 = await Validate.test(response2.result);
    assert.strictEqual(isValid2, true);
    assert.deepStrictEqual(response2.result.info.description, 'This is the shop API docs');
    assert.deepStrictEqual(response2.result.paths['/shop/'].post.operationId, 'postShop');
  });
});
