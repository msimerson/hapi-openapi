const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

describe('definitions (OpenAPI)', () => {
  const routes = [
    {
      method: 'POST',
      path: '/test/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            a: Joi.number().required().description('the first number'),

            b: Joi.number().required().description('the second number'),

            operator: Joi.string().required().default('+').description('the operator i.e. + - / or *'),

            equals: Joi.number().required().description('the result of the sum')
          })
        }
      }
    },
    {
      method: 'POST',
      path: '/test/2',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            a: Joi.string(),
            b: Joi.object({
              c: Joi.string()
            })
          }).label('Model')
        }
      }
    },
    {
      method: 'POST',
      path: '/test/3',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            a: Joi.string(),
            b: Joi.object({
              c: Joi.string()
            })
          }).label('Model1')
        }
      }
    }
  ];

  it('payload with inline definition', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0' }, routes);

    const definition = {
      properties: {
        a: {
          description: 'the first number',
          type: 'number'
        },
        b: {
          description: 'the second number',
          type: 'number'
        },
        operator: {
          description: 'the operator i.e. + - / or *',
          default: '+',
          type: 'string'
        },
        equals: {
          description: 'the result of the sum',
          type: 'number'
        }
      },
      required: ['a', 'b', 'operator', 'equals'],
      type: 'object'
    };

    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test/'].post.requestBody, {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Model2'
          }
        }
      }
    });
    assert.deepStrictEqual(response.result.components.schemas.Model2, definition);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('override definition named Model', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0' }, routes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    //console.log(JSON.stringify(response.result.definitions));
    assert.ok(response.result.components.schemas.b != null);
    assert.ok(response.result.components.schemas.Model != null);
    assert.ok(response.result.components.schemas.Model1 != null);

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('reuseDefinitions = false', async () => {
    // forces two models even though the model hash is the same

    const tempRoutes = [
      {
        method: 'POST',
        path: '/store1/',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api'],
          validate: {
            payload: Joi.object({
              a: Joi.number(),
              b: Joi.number(),
              operator: Joi.string(),
              equals: Joi.number()
            }).label('A')
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
            payload: Joi.object({
              a: Joi.number(),
              b: Joi.number(),
              operator: Joi.string(),
              equals: Joi.number()
            }).label('B')
          }
        }
      }
    ];

    const server = await Helper.createServer({ OAS: 'v3.0', reuseDefinitions: false }, tempRoutes);

    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    //console.log(JSON.stringify(response.result));
    assert.deepStrictEqual(response.statusCode, 200);
    assert.ok(response.result.components.schemas.A != null);
    assert.ok(response.result.components.schemas.B != null);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('definitionPrefix = useLabel', async () => {
    // use the label as a prefix for dynamic model names

    const tempRoutes = [
      {
        method: 'POST',
        path: '/store1/',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api'],
          validate: {
            payload: Joi.object({
              a: Joi.number(),
              b: Joi.number(),
              operator: Joi.string(),
              equals: Joi.number()
            }).label('A')
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
            payload: Joi.object({
              c: Joi.number(),
              v: Joi.number(),
              operator: Joi.string(),
              equals: Joi.number()
            }).label('A A')
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
            payload: Joi.object({
              c: Joi.number(),
              f: Joi.number(),
              operator: Joi.string(),
              equals: Joi.number()
            }).label('A')
          }
        }
      }
    ];

    const server = await Helper.createServer({ OAS: 'v3.0', definitionPrefix: 'useLabel' }, tempRoutes);

    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.ok(response.result.components.schemas.A != null);
    assert.ok(response.result.components.schemas['A A'] != null);
    assert.ok(response.result.components.schemas.A1 != null);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('test that optional array is not in swagger output', async () => {
    const testRoutes = [
      {
        method: 'POST',
        path: '/server/1/',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api'],
          validate: {
            payload: Joi.object({
              a: Joi.number().required(),
              b: Joi.string().optional()
            }).label('test')
          }
        }
      }
    ];

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);

    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.components.schemas.test, {
      type: 'object',
      properties: {
        a: {
          type: 'number'
        },
        b: {
          type: 'string'
        }
      },
      required: ['a']
    });
  });

  it('test that name changing for required', async () => {
    const FormDependencyDefinition = Joi.object({
      id: Joi.number().required()
    }).label('FormDependencyDefinition');

    const ActionDefinition = Joi.object({
      id: Joi.number().required().allow(null),
      reminder: FormDependencyDefinition.required()
    }).label('ActionDefinition');

    const testRoutes = [
      {
        method: 'POST',
        path: '/server/',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api'],
          validate: {
            payload: ActionDefinition
          }
        }
      }
    ];

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);

    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.components.schemas.ActionDefinition, {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          nullable: true
        },
        reminder: {
          $ref: '#/components/schemas/FormDependencyDefinition'
        }
      },
      required: ['id', 'reminder']
    });
  });

  it('test that similar object definition with different labels are not merged', async () => {
    const testRoutes = [
      {
        method: 'POST',
        path: '/users',
        options: {
          handler: Helper.defaultHandler,
          description: 'Create new end-user',
          notes: 'Create user',
          tags: ['api'],
          validate: {
            payload: Joi.object({
              name: Joi.string().required(),
              email: Joi.string().email().required()
            }).label('user')
          }
        }
      },
      {
        method: 'POST',
        path: '/admins',
        options: {
          handler: Helper.defaultHandler,
          description: 'Create new admin',
          notes: 'Create admin',
          tags: ['api'],
          validate: {
            payload: Joi.object({
              name: Joi.string().required(),
              email: Joi.string().email().required()
            }).label('admin')
          }
        }
      },
      {
        method: 'PUT',
        path: '/admins',
        options: {
          handler: Helper.defaultHandler,
          description: 'Update admin',
          notes: 'Update admin',
          tags: ['api'],
          validate: {
            payload: Joi.object({
              name: Joi.string().required(),
              email: Joi.string().email().required()
            }).label('admin')
          }
        }
      },
      {
        method: 'PUT',
        path: '/other',
        options: {
          handler: Helper.defaultHandler,
          description: 'Other',
          notes: 'Other',
          tags: ['api'],
          validate: {
            payload: Joi.object({
              name: Joi.string().required(),
              email: Joi.string().email().required()
            }).label('other')
          }
        }
      },
      {
        method: 'PUT',
        path: '/unknown',
        options: {
          handler: Helper.defaultHandler,
          description: 'Unknown',
          notes: 'Unknown',
          tags: ['api'],
          validate: {
            payload: Joi.object({
              name: Joi.string().required(),
              email: Joi.string().email().required()
            })
          }
        }
      }
    ];

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);

    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.components.schemas).length, 4);
    assert.deepStrictEqual(Object.keys(response.result.components.schemas).includes('admin'), true);
    assert.deepStrictEqual(Object.keys(response.result.components.schemas).includes('user'), true);
    assert.deepStrictEqual(Object.keys(response.result.components.schemas).includes('other'), true);
    assert.deepStrictEqual(Object.keys(response.result.components.schemas).includes('Model1'), true);
  });
});
