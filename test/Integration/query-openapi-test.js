const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

describe('query (OpenAPI)', () => {
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
              altParam: Joi.alternatives().try(Joi.number(), Joi.string())
            })
          }
        }
      }
    ];

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/required'].get.parameters, [
      {
        name: 'requiredParameter',
        in: 'query',
        required: true,
        schema: {
          type: 'string'
        }
      },
      {
        name: 'existParameter',
        in: 'query',
        required: true,
        schema: {
          type: 'string'
        }
      },
      {
        name: 'defaultParameter',
        in: 'query',
        schema: {
          type: 'string'
        }
      },
      {
        name: 'optionalParameter',
        in: 'query',
        schema: {
          type: 'string'
        }
      }
    ]);

    assert.deepStrictEqual(response.result.paths['/altParam'].get.parameters, [
      {
        name: 'altParam',
        in: 'query',
        schema: {
          anyOf: [{ type: 'number' }, { type: 'string' }]
        }
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

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    // OAS v3.0: object query params use content-based JSON encoding
    assert.deepStrictEqual(response.result.paths['/emptyobject'].get.parameters, [
      {
        name: 'objParam',
        in: 'query',
        content: {
          'application/json': {
            schema: {
              type: 'object'
            }
          }
        }
      }
    ]);

    assert.deepStrictEqual(response.result.paths['/objectWithProps'].get.parameters, [
      {
        name: 'objParam',
        in: 'query',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                stringParam: {
                  type: 'string'
                }
              }
            }
          }
        }
      }
    ]);

    assert.deepStrictEqual(response.result.paths['/arrayOfObjects'].get.parameters, [
      {
        name: 'arrayParam',
        in: 'query',
        style: 'form',
        explode: true,
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              stringParam: {
                type: 'string'
              }
            }
          }
        }
      }
    ]);
    assert.deepStrictEqual(response.result.paths['/arrayWithItemDescription'].get.parameters, [
      {
        name: 'arrayParam',
        in: 'query',
        description: 'Array description',
        style: 'form',
        explode: true,
        schema: {
          type: 'array',
          description: 'Array description',
          items: {
            type: 'object',
            description: 'Item description',
            properties: {
              stringParam: {
                type: 'string',
                description: 'String param description'
              }
            }
          }
        }
      }
    ]);

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('labeled object query param creates $ref definition', async () => {
    const testRoutes = [
      {
        method: 'GET',
        path: '/labeled',
        options: {
          tags: ['api'],
          handler: () => {},
          validate: {
            query: Joi.object({
              filter: Joi.object({
                name: Joi.string(),
                age: Joi.number()
              }).label('MyFilter')
            })
          }
        }
      }
    ];

    const server = await Helper.createServer({ OAS: 'v3.0', definitionPrefix: 'useLabel' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);

    // labeled object query param should produce a $ref in content encoding
    assert.deepStrictEqual(response.result.paths['/labeled'].get.parameters, [
      {
        name: 'filter',
        in: 'query',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/MyFilter'
            }
          }
        }
      }
    ]);

    // the definition should exist in components.schemas
    assert.ok(response.result.components.schemas.MyFilter != null);
    assert.deepStrictEqual(response.result.components.schemas.MyFilter.type, 'object');
    assert.deepStrictEqual(response.result.components.schemas.MyFilter.properties.name.type, 'string');
    assert.deepStrictEqual(response.result.components.schemas.MyFilter.properties.age.type, 'number');

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('required object query param preserves required flag', async () => {
    const testRoutes = [
      {
        method: 'GET',
        path: '/requiredFilter',
        options: {
          tags: ['api'],
          handler: () => {},
          validate: {
            query: Joi.object({
              filter: Joi.object({
                status: Joi.string()
              }).required()
            })
          }
        }
      }
    ];

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);

    assert.deepStrictEqual(response.result.paths['/requiredFilter'].get.parameters, [
      {
        name: 'filter',
        in: 'query',
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string'
                }
              }
            }
          }
        }
      }
    ]);

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });
});
