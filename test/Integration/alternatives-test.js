const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

describe('alternatives', () => {
  const routes = [
    {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.alternatives()
            .try(Joi.number().meta({ title: 'a number' }), Joi.string().meta({ title: 'a string' }))
            .label('Alt')
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
          payload: Joi.alternatives()
            .try(
              Joi.object({
                name: Joi.string().required()
              })
                .label('alt1')
                .meta({ swaggerLabel: 'alternative1' }),
              Joi.object({
                name: Joi.number().required()
              })
                .label('alt2')
                .meta({ swaggerLabel: 'alternative2' })
            )
            .label('Alternative')
        },
        response: {
          schema: Joi.alternatives()
            .try(
              Joi.object({
                name: Joi.string().required()
              })
                .label('alt1')
                .meta({ swaggerLabel: 'alternative1' }),
              Joi.object({
                name: Joi.number().required()
              })
                .label('alt2')
                .meta({ swaggerLabel: 'alternative2' })
            )
            .label('Alternative')
        }
      }
    },
    {
      method: 'POST',
      path: '/store3/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.alternatives()
            .try(
              Joi.object({
                name: Joi.string().required()
              }).label('Model A'),
              Joi.object({
                name: Joi.number().required()
              }).label('Model B')
            )
            .label('Alt')
        }
      }
    },
    {
      method: 'POST',
      path: '/store4/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            type: Joi.string().valid('string', 'number', 'image').label('Type'),
            data: Joi.alternatives()
              .conditional('type', { is: 'string', then: Joi.string() })
              .conditional('type', { is: 'number', then: Joi.number() })
              .conditional('type', { is: 'image', then: Joi.string().uri() })
              .label('Typed Data'),
            extra: Joi.alternatives()
              .conditional('type', {
                is: 'image',
                then: Joi.object({
                  width: Joi.number(),
                  height: Joi.number()
                })
                  .label('Dimensions')
                  .meta({ swaggerLabel: 'Dimensions' }),
                otherwise: Joi.forbidden()
              })
              .label('Extra')
          })
        }
      }
    },
    {
      method: 'POST',
      path: '/store5/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            type: Joi.string().valid('string', 'number', 'image').label('Type'),
            key: Joi.string().when('category', {
              is: 'stuff',
              then: Joi.forbidden() // https://github.com/hapi-swagger/hapi-swagger/issues/338
            }),
            data: Joi.alternatives()
              .conditional('type', { is: 'string', then: Joi.string() })
              .conditional('type', { is: 'number', then: Joi.number() })
              .conditional('type', { is: 'image', then: Joi.string().uri() })
              .label('Typed Data'),
            extra: Joi.alternatives()
              .conditional('type', {
                is: 'image',
                then: Joi.object({
                  width: Joi.number(),
                  height: Joi.number()
                }).label('Dimensions'),
                otherwise: Joi.forbidden()
              })
              .label('Extra')
          })
        }
      }
    }
  ];

  it('x-alternatives', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters, [
      {
        in: 'body',
        schema: {
          type: 'number'
        },
        'x-alternatives': [
          {
            'x-meta': {
              title: 'a number'
            },
            type: 'number',
            title: 'a number'
          },
          {
            'x-meta': {
              title: 'a string'
            },
            type: 'string',
            title: 'a string'
          }
        ],
        'x-meta': {
          title: 'a number'
        },
        name: 'body'
      }
    ]);

    assert.deepStrictEqual(response.result.paths['/store2/'].post.parameters, [
      {
        in: 'body',
        name: 'body',
        schema: {
          $ref: '#/definitions/Alternative'
        },
        'x-alternatives': [
          {
            $ref: '#/x-alt-definitions/alternative1'
          },
          {
            $ref: '#/x-alt-definitions/alternative2'
          }
        ]
      }
    ]);

    assert.deepStrictEqual(response.result.paths['/store2/'].post.responses, {
      200: {
        schema: {
          $ref: '#/definitions/Alternative',
          'x-alternatives': [
            {
              $ref: '#/x-alt-definitions/alternative1'
            },
            {
              $ref: '#/x-alt-definitions/alternative2'
            }
          ]
        },
        description: 'Successful'
      }
    });

    assert.deepStrictEqual(response.result['x-alt-definitions'].alternative1, {
      type: 'object',
      properties: {
        name: {
          type: 'string'
        }
      },
      required: ['name']
    });

    assert.deepStrictEqual(response.result.definitions.Model1, {
      type: 'object',
      properties: {
        type: {
          $ref: '#/definitions/Type'
        },
        data: {
          type: 'string',
          'x-alternatives': [
            {
              type: 'string'
            },
            {
              type: 'number'
            },
            {
              type: 'string',
              'x-format': {
                uri: true
              }
            }
          ]
        },
        extra: {
          $ref: '#/definitions/Dimensions',
          'x-alternatives': [
            {
              $ref: '#/x-alt-definitions/Dimensions'
            }
          ]
        }
      }
    });

    // test full swagger document
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('no x-alternatives', async () => {
    const server = await Helper.createServer({ xProperties: false }, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.statusCode, 200);

    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters, [
      {
        name: 'body',
        in: 'body',
        schema: {
          type: 'number'
        }
      }
    ]);
    assert.deepStrictEqual(response.result.paths['/store2/'].post.parameters, [
      {
        name: 'body',
        in: 'body',
        schema: {
          $ref: '#/definitions/Alternative'
        }
      }
    ]);

    assert.deepStrictEqual(response.result.paths['/store4/'].post.parameters, [
      {
        in: 'body',
        name: 'body',
        schema: {
          $ref: '#/definitions/Model1'
        }
      }
    ]);

    assert.deepStrictEqual(response.result.definitions, {
      Alternative: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          }
        },
        required: ['name']
      },
      Alt: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          }
        },
        required: ['name']
      },
      Dimensions: {
        type: 'object',
        properties: {
          width: {
            type: 'number'
          },
          height: {
            type: 'number'
          }
        }
      },
      Type: {
        enum: ['string', 'number', 'image'],
        type: 'string'
      },
      Model1: {
        type: 'object',
        properties: {
          type: {
            $ref: '#/definitions/Type'
          },
          data: {
            type: 'string'
          },
          extra: {
            $ref: '#/definitions/Dimensions'
          }
        }
      },
      Model2: {
        type: 'object',
        properties: {
          type: {
            $ref: '#/definitions/Type'
          },
          key: {
            type: 'string'
          },
          data: {
            type: 'string'
          },
          extra: {
            $ref: '#/definitions/Dimensions'
          }
        }
      }
    });

    // test full swagger document
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('OpenAPI v3.0', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0' }, routes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.statusCode, 200);

    assert.deepStrictEqual(response.result.paths['/store/'].post.requestBody, {
      content: {
        'application/json': {
          schema: {
            anyOf: [
              {
                type: 'number',
                'x-meta': {
                  title: 'a number'
                },
                title: 'a number'
              },
              { type: 'string', 'x-meta': { title: 'a string' }, title: 'a string' }
            ]
          }
        }
      }
    });
    assert.deepStrictEqual(response.result.paths['/store2/'].post.requestBody, {
      content: {
        'application/json': {
          schema: {
            anyOf: [
              {
                $ref: '#/x-alt-definitions/alternative1'
              },
              {
                $ref: '#/x-alt-definitions/alternative2'
              }
            ]
          }
        }
      }
    });
    assert.deepStrictEqual(response.result.paths['/store2/'].post.responses, {
      200: {
        content: {
          'application/json': {
            schema: {
              anyOf: [
                {
                  $ref: '#/x-alt-definitions/alternative1'
                },
                {
                  $ref: '#/x-alt-definitions/alternative2'
                }
              ]
            }
          }
        },
        description: 'Successful'
      }
    });

    assert.deepStrictEqual(response.result.paths['/store4/'].post.requestBody, {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Model1'
          }
        }
      }
    });

    assert.deepStrictEqual(response.result.components.schemas, {
      Type: { type: 'string', enum: ['string', 'number', 'image'] },
      Model1: {
        type: 'object',
        properties: {
          type: { $ref: '#/components/schemas/Type' },
          data: { anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'string', 'x-format': { uri: true } }] },
          extra: { anyOf: [{ $ref: '#/x-alt-definitions/Dimensions' }] }
        }
      },
      Model2: {
        type: 'object',
        properties: {
          type: { $ref: '#/components/schemas/Type' },
          key: { type: 'string' },
          data: {
            anyOf: [
              {
                type: 'string'
              },
              { type: 'number' },
              { type: 'string', 'x-format': { uri: true } }
            ]
          },
          extra: { anyOf: [{ $ref: '#/x-alt-definitions/Dimensions' }] }
        }
      }
    });

    assert.deepStrictEqual(response.result['x-alt-definitions'], {
      alternative1: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
      },
      alternative2: {
        type: 'object',
        properties: { name: { type: 'number' } },
        required: ['name']
      },
      'Model A': {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
      },
      'Model B': {
        type: 'object',
        properties: { name: { type: 'number' } },
        required: ['name']
      },
      Dimensions: {
        type: 'object',
        properties: { width: { type: 'number' }, height: { type: 'number' } }
      }
    });

    // test full swagger document
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });
});
