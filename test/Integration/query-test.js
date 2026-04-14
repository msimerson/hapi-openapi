const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');
const Validate = require('../../lib/validate.js');

describe('query', () => {
  it('parameter required', async () => {
    const testRoutes = [
      {
        method: 'GET',
        path: '/required',
        options: {
          handler: () => {},
          tags: ['api'],
          validate: {
            query: Joi.object({
              requiredParameter: Joi.string().required(),
              existParameter: Joi.string().exist(),
              defaultParameter: Joi.string(),
              optionalParameter: Joi.string().optional()
            })
          }
        }
      },
      {
        method: 'GET',
        path: '/altParam',
        options: {
          handler: () => {},
          tags: ['api'],
          validate: {
            query: Joi.object({
              altParam: Joi.alternatives().try(Joi.number().required(), Joi.string())
            })
          }
        }
      }
    ];

    const server = await Helper.createServer({}, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/required'].get.parameters, [
      {
        type: 'string',
        name: 'requiredParameter',
        in: 'query',
        required: true
      },
      {
        type: 'string',
        name: 'existParameter',
        in: 'query',
        required: true
      },
      {
        type: 'string',
        name: 'defaultParameter',
        in: 'query'
      },
      {
        type: 'string',
        name: 'optionalParameter',
        in: 'query',
        required: false
      }
    ]);

    assert.deepStrictEqual(response.result.paths['/altParam'].get.parameters, [
      {
        type: 'number',
        'x-alternatives': [{ type: 'number' }, { type: 'string' }],
        name: 'altParam',
        in: 'query'
      }
    ]);

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('parameter of object type', async () => {
    const testRoutes = [
      {
        method: 'GET',
        path: '/emptyobject',
        options: {
          tags: ['api'],
          handler: () => {},
          validate: {
            query: Joi.object({
              objParam: Joi.object()
            })
          }
        }
      },
      {
        method: 'GET',
        path: '/objectWithProps',
        options: {
          tags: ['api'],
          handler: () => {},
          validate: {
            query: Joi.object({
              objParam: Joi.object({
                stringParam: Joi.string()
              })
            })
          }
        }
      },
      {
        method: 'GET',
        path: '/arrayOfObjects',
        options: {
          tags: ['api'],
          handler: () => {},
          validate: {
            query: Joi.object({
              arrayParam: Joi.array().items({
                stringParam: Joi.string()
              })
            })
          }
        }
      },
      {
        method: 'GET',
        path: '/arrayWithItemDescription',
        options: {
          tags: ['api'],
          handler: () => {},
          validate: {
            query: Joi.object({
              arrayParam: Joi.array()
                .items(
                  Joi.object({
                    stringParam: Joi.string().description('String param description')
                  }).description('Item description')
                )
                .description('Array description')
            })
          }
        }
      }
    ];

    const server = await Helper.createServer({}, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/emptyobject'].get.parameters, [
      {
        type: 'string',
        name: 'objParam',
        in: 'query',
        'x-type': 'object'
      }
    ]);

    assert.deepStrictEqual(response.result.paths['/objectWithProps'].get.parameters, [
      {
        type: 'string',
        name: 'objParam',
        in: 'query',
        'x-type': 'object',
        'x-properties': {
          stringParam: {
            type: 'string'
          }
        }
      }
    ]);

    assert.deepStrictEqual(response.result.paths['/arrayOfObjects'].get.parameters, [
      {
        type: 'array',
        name: 'arrayParam',
        in: 'query',
        items: {
          type: 'string',
          'x-type': 'object',
          'x-properties': {
            stringParam: {
              type: 'string'
            }
          }
        },
        collectionFormat: 'multi'
      }
    ]);
    assert.deepStrictEqual(response.result.paths['/arrayWithItemDescription'].get.parameters, [
      {
        type: 'array',
        name: 'arrayParam',
        in: 'query',
        description: 'Array description',
        items: {
          type: 'string',
          'x-type': 'object',
          'x-properties': {
            stringParam: {
              type: 'string',
              description: 'String param description'
            }
          }
        },
        collectionFormat: 'multi'
      }
    ]);

    const isValid = await Validate.test(response.result, console.log);
    assert.strictEqual(isValid, true);
  });
});
