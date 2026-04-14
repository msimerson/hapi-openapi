const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');
const Validate = require('../../lib/validate.js');

describe('array', () => {
  const routes = [
    {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object().keys({
            someIds: Joi.array().items(Joi.number(), Joi.string())
          })
        }
      }
    },
    {
      method: 'GET',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        response: {
          status: {
            200: Joi.object().keys({
              objectIds: Joi.array().items(
                Joi.object().keys({ id: Joi.number() }),
                Joi.object().keys({ id: Joi.string() })
              )
            })
          }
        }
      }
    },
    {
      method: 'PUT',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object().keys({
            ids: Joi.array().items(Joi.object().keys({ id: Joi.number() }))
          })
        }
      }
    },
    {
      method: 'POST',
      path: '/store-2/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object().keys({
            ids: Joi.array().items()
          })
        }
      }
    }
  ];

  describe('OpenAPI v2', () => {
    it('With multiple items should pick the first', async () => {
      const server = await Helper.createServer({}, routes);
      const response = await server.inject({ method: 'GET', url: '/swagger.json' });

      assert.deepStrictEqual(response.statusCode, 200);

      assert.deepStrictEqual(response.result.definitions.Model1, {
        type: 'object',
        properties: {
          id: {
            type: 'number'
          }
        }
      });

      assert.deepStrictEqual(response.result.definitions.objectIds, {
        type: 'array',
        items: {
          $ref: '#/definitions/Model1'
        }
      });

      assert.deepStrictEqual(response.result.definitions.Model2, {
        type: 'object',
        properties: {
          objectIds: {
            $ref: '#/definitions/objectIds'
          }
        }
      });

      assert.deepStrictEqual(response.result.paths['/store/'].get.responses, {
        200: {
          description: 'Successful',
          schema: {
            $ref: '#/definitions/Model2'
          }
        }
      });

      const isValid = await Validate.test(response.result);
      assert.strictEqual(isValid, true);
    });

    it('With one item', async () => {
      const server = await Helper.createServer({}, routes);
      const response = await server.inject({ method: 'GET', url: '/swagger.json' });

      assert.deepStrictEqual(response.statusCode, 200);

      assert.deepStrictEqual(response.result.definitions.Model5, {
        type: 'object',
        properties: {
          id: {
            type: 'number'
          }
        }
      });

      assert.deepStrictEqual(response.result.definitions.Model6, {
        type: 'array',
        items: {
          $ref: '#/definitions/Model5'
        }
      });

      assert.deepStrictEqual(response.result.definitions.Model7, {
        type: 'object',
        properties: {
          ids: {
            $ref: '#/definitions/Model6'
          }
        }
      });

      assert.deepStrictEqual(response.result.paths['/store/'].put.parameters[0], {
        in: 'body',
        name: 'body',
        schema: { $ref: '#/definitions/Model7' }
      });

      const isValid = await Validate.test(response.result);
      assert.strictEqual(isValid, true);
    });

    it('Without items', async () => {
      const server = await Helper.createServer({}, routes);
      const response = await server.inject({ method: 'GET', url: '/swagger.json' });

      assert.deepStrictEqual(response.statusCode, 200);

      assert.deepStrictEqual(response.result.definitions.ids, {
        type: 'array',
        items: {
          type: 'string'
        }
      });

      assert.deepStrictEqual(response.result.definitions.Model4, {
        type: 'object',
        properties: {
          ids: {
            $ref: '#/definitions/ids'
          }
        }
      });

      assert.deepStrictEqual(response.result.paths['/store-2/'].post.parameters[0], {
        in: 'body',
        name: 'body',
        schema: { $ref: '#/definitions/Model4' }
      });

      const isValid = await Validate.test(response.result);
      assert.strictEqual(isValid, true);
    });
  });

  describe('OpenAPI v3', () => {
    it('With multiple items', async () => {
      const server = await Helper.createServer({ OAS: 'v3.0' }, routes);
      const response = await server.inject({ method: 'GET', url: '/openapi.json' });

      assert.deepStrictEqual(response.statusCode, 200);

      assert.deepStrictEqual(response.result.components.schemas.someIds, {
        type: 'array',
        items: {
          anyOf: [{ type: 'number' }, { type: 'string' }]
        }
      });

      assert.deepStrictEqual(response.result.components.schemas.Model4, {
        type: 'object',
        properties: {
          someIds: {
            $ref: '#/components/schemas/someIds'
          }
        }
      });

      assert.deepStrictEqual(response.result.paths['/store/'].post.requestBody, {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Model4'
            }
          }
        }
      });

      const isValid = await Validate.test(response.result);
      assert.strictEqual(isValid, true);
    });

    it('With one item', async () => {
      const server = await Helper.createServer({ OAS: 'v3.0' }, routes);
      const response = await server.inject({ method: 'GET', url: '/openapi.json' });

      assert.deepStrictEqual(response.statusCode, 200);

      assert.deepStrictEqual(response.result.components.schemas.Model6, {
        type: 'object',
        properties: {
          id: {
            type: 'number'
          }
        }
      });

      assert.deepStrictEqual(response.result.components.schemas.Model7, {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Model6'
        }
      });

      assert.deepStrictEqual(response.result.components.schemas.Model8, {
        type: 'object',
        properties: {
          ids: {
            $ref: '#/components/schemas/Model7'
          }
        }
      });

      assert.deepStrictEqual(response.result.paths['/store/'].put.requestBody, {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Model8'
            }
          }
        }
      });

      const isValid = await Validate.test(response.result);
      assert.strictEqual(isValid, true);
    });

    it('Without items', async () => {
      const server = await Helper.createServer({ OAS: 'v3.0' }, routes);
      const response = await server.inject({ method: 'GET', url: '/openapi.json' });

      assert.deepStrictEqual(response.statusCode, 200);

      assert.deepStrictEqual(response.result.components.schemas.ids, {
        type: 'array',
        items: {
          type: 'string'
        }
      });

      assert.deepStrictEqual(response.result.components.schemas.Model5, {
        type: 'object',
        properties: {
          ids: {
            $ref: '#/components/schemas/ids'
          }
        }
      });

      assert.deepStrictEqual(response.result.paths['/store-2/'].post.requestBody, {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Model5'
            }
          }
        }
      });

      const isValid = await Validate.test(response.result);
      assert.strictEqual(isValid, true);
    });
  });
});
