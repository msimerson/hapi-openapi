const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Hoek = require('@hapi/hoek');
const Helper = require('../helper.js');
const Validate = require('../../lib/validate.js');

describe('path (OpenAPI)', () => {
  const routes = {
    method: 'POST',
    path: '/test',
    handler: Helper.defaultHandler,
    options: {
      description: 'Add sum',
      notes: ['Adds a sum to the data store'],
      tags: ['api'],
      validate: {
        payload: Joi.object({
          a: Joi.number().required().description('the first number').default(10),

          b: Joi.number().required().description('the second number'),

          operator: Joi.string()
            .required()
            .default('+')
            .valid('+', '-', '/', '*')
            .description('the operator i.e. + - / or *'),

          equals: Joi.number().required().description('the result of the sum')
        })
      }
    }
  };

  it('summary and description', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0' }, routes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test'].post.summary, 'Add sum');
    assert.deepStrictEqual(response.result.paths['/test'].post.description, 'Adds a sum to the data store');
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('description as an array', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.notes = ['note one', 'note two'];
    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test'].post.description, 'note one<br/><br/>note two');
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('route settting of consumes produces', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.plugins = {
      '@msimerson/hapi-openapi': {
        consumes: ['application/x-www-form-urlencoded'],
        produces: ['application/json', 'application/xml']
      }
    };

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.paths['/test'].post.requestBody.content), [
      'application/x-www-form-urlencoded'
    ]);
    assert.deepStrictEqual(Object.keys(response.result.paths['/test'].post.responses.default.content), [
      'application/json',
      'application/xml'
    ]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('override plug-in settting of consumes produces', async () => {
    const swaggerOptions = {
      OAS: 'v3.0',
      consumes: ['application/json'],
      produces: ['application/json']
    };

    const testRoutes = Hoek.clone(routes);
    testRoutes.options.plugins = {
      '@msimerson/hapi-openapi': {
        consumes: ['application/x-www-form-urlencoded'],
        produces: ['application/json', 'application/xml']
      }
    };

    const server = await Helper.createServer(swaggerOptions, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.paths['/test'].post.requestBody.content), [
      'application/x-www-form-urlencoded'
    ]);
    assert.deepStrictEqual(Object.keys(response.result.paths['/test'].post.responses.default.content), [
      'application/json',
      'application/xml'
    ]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('auto "x-www-form-urlencoded" consumes with payloadType', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.plugins = {
      '@msimerson/hapi-openapi': {
        payloadType: 'form'
      }
    };

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.paths['/test'].post.requestBody.content), [
      'application/x-www-form-urlencoded'
    ]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('rename a parameter', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.plugins = {
      '@msimerson/hapi-openapi': {
        payloadType: 'form'
      }
    };
    testRoutes.options.validate.payload = Joi.object({
      a: Joi.string().label('foo')
    });

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test'].post.requestBody, {
      content: {
        'application/x-www-form-urlencoded': {
          schema: {
            type: 'object',
            properties: {
              a: {
                type: 'string'
              }
            }
          }
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('auto "multipart/form-data" consumes with { swaggerType: "file" }', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.plugins = {
      '@msimerson/hapi-openapi': {
        payloadType: 'form'
      }
    };

    testRoutes.options.validate = {
      payload: Joi.object({
        file: Joi.any().meta({ swaggerType: 'file' }).description('json file')
      })
    };
    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.paths['/test'].post.requestBody.content), [
      'multipart/form-data'
    ]);
  });

  it('auto "multipart/form-data" do not add two', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.validate = {
      payload: Joi.object({
        file: Joi.any().meta({ swaggerType: 'file' }).description('json file')
      })
    };

    testRoutes.options.plugins = {
      '@msimerson/hapi-openapi': {
        consumes: ['multipart/form-data']
      }
    };

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.paths['/test'].post.requestBody.content), [
      'multipart/form-data'
    ]);
  });

  it('auto "application/x-www-form-urlencoded" do not add two', async () => {
    const testRoutes = Hoek.clone(routes);

    ((testRoutes.options.validate = {
      payload: Joi.object({
        file: Joi.string().description('json file')
      })
    }),
      (testRoutes.options.plugins = {
        '@msimerson/hapi-openapi': {
          consumes: ['application/x-www-form-urlencoded']
        }
      }));

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.paths['/test'].post.requestBody.content), [
      'application/x-www-form-urlencoded'
    ]);
  });

  it('a user set content-type header removes consumes', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.validate.headers = Joi.object({
      'content-type': Joi.string().valid(
        'application/json',
        'application/json;charset=UTF-8',
        'application/json; charset=UTF-8'
      )
    }).unknown();

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.ok(response.result.paths['/test'].post.consumes == null);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('payloadType form', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.plugins = {
      '@msimerson/hapi-openapi': {
        payloadType: 'form'
      }
    };

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.paths['/test'].post.requestBody.content), [
      'application/x-www-form-urlencoded'
    ]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('accept header', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.validate.headers = Joi.object({
      accept: Joi.string().required().valid('application/json', 'application/vnd.api+json')
    }).unknown();

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.paths['/test'].post.responses.default.content), [
      'application/json',
      'application/vnd.api+json'
    ]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('accept header - no emum', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.validate.headers = Joi.object({
      accept: Joi.string().required().default('application/vnd.api+json')
    }).unknown();

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test'].post.parameters[0], {
      required: true,
      in: 'header',
      name: 'accept',
      schema: {
        type: 'string',
        default: 'application/vnd.api+json'
      }
    });
    assert.ok(response.result.paths['/test'].post.produces == null);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('accept header - default first', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.validate.headers = Joi.object({
      accept: Joi.string()
        .required()
        .valid('application/json', 'application/vnd.api+json')
        .default('application/vnd.api+json')
    }).unknown();

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test'].post.responses, {
      default: {
        description: 'Successful',
        content: {
          'application/vnd.api+json': { schema: { type: 'string' } },
          'application/json': { schema: { type: 'string' } }
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('accept header acceptToProduce set to false', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.validate.headers = Joi.object({
      accept: Joi.string()
        .required()
        .valid('application/json', 'application/vnd.api+json')
        .default('application/vnd.api+json')
    }).unknown();

    const server = await Helper.createServer({ OAS: 'v3.0', acceptToProduce: false }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test'].post.parameters[0], {
      required: true,
      in: 'header',
      name: 'accept',
      schema: {
        enum: ['application/json', 'application/vnd.api+json'],
        type: 'string',
        default: 'application/vnd.api+json'
      }
    });
    assert.ok(response.result.paths['/test'].post.produces == null);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('path parameters {id}/{note?}', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.path = '/servers/{id}/{note?}';
    testRoutes.options.validate = {
      params: Joi.object({
        id: Joi.number().integer().required().description('ID of server to delete'),
        note: Joi.string().description('Note..')
      })
    };

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.ok(response.result.paths['/servers/{id}/{note}'] != null);
  });

  it('path parameters {a}/{b?} required overriden by JOI', async () => {
    const testRoutes = [
      {
        method: 'POST',
        path: '/server/1/{a}/{b?}',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api'],
          validate: {
            params: Joi.object({
              a: Joi.number().required(),
              b: Joi.string().required()
            })
          }
        }
      },
      {
        method: 'POST',
        path: '/server/2/{c}/{d?}',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api'],
          validate: {
            params: Joi.object({
              c: Joi.number().optional(),
              d: Joi.string().optional()
            })
          }
        }
      },
      {
        method: 'POST',
        path: '/server/3/{e}/{f?}',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api'],
          validate: {
            params: Joi.object({
              e: Joi.number(),
              f: Joi.string()
            })
          }
        }
      }
    ];

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/server/1/{a}/{b}'].post.parameters, [
      {
        name: 'a',
        in: 'path',
        required: true,
        schema: {
          type: 'number'
        }
      },
      {
        name: 'b',
        in: 'path',
        required: true,
        schema: {
          type: 'string'
        }
      }
    ]);
    assert.deepStrictEqual(response.result.paths['/server/2/{c}/{d}'].post.parameters, [
      {
        in: 'path',
        name: 'c',
        required: true,
        schema: {
          type: 'number'
        }
      },
      {
        in: 'path',
        name: 'd',
        schema: {
          type: 'string'
        }
      }
    ]);
    assert.deepStrictEqual(response.result.paths['/server/3/{e}/{f}'].post.parameters, [
      {
        required: true,
        in: 'path',
        name: 'e',
        schema: {
          type: 'number'
        }
      },
      {
        in: 'path',
        name: 'f',
        schema: {
          type: 'string'
        }
      }
    ]);
  });

  it('path and basePath', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.path = '/v3/servers/{id}';
    testRoutes.options.validate = {
      params: Joi.object({
        id: Joi.number().integer().required().description('ID of server to delete')
      })
    };

    const server = await Helper.createServer({ OAS: 'v3.0', basePath: '/v3' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.ok(response.result.paths['/servers/{id}'] != null);
  });

  it('basePath trim tailing slash', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.path = '/v3/servers/{id}';
    testRoutes.options.validate = {
      params: Joi.object({
        id: Joi.number().integer().required().description('ID of server to delete')
      })
    };

    const server = await Helper.createServer({ OAS: 'v3.0', basePath: '/v3/' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.ok(response.result.paths['/servers/{id}'] != null);
  });

  it('path, basePath suppressing version fragment', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.path = '/api/v3/servers/{id}';
    testRoutes.options.validate = {
      params: Joi.object({
        id: Joi.number().integer().required().description('ID of server to delete')
      })
    };

    const options = {
      OAS: 'v3.0',
      basePath: '/api',
      pathReplacements: [
        {
          replaceIn: 'all',
          pattern: /v([0-9]+)\//,
          replacement: ''
        }
      ]
    };

    const server = await Helper.createServer(options, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.ok(response.result.paths['/servers/{id}'] != null);
  });

  it('route deprecated', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.plugins = {
      '@msimerson/hapi-openapi': {
        deprecated: true
      }
    };

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test'].post.deprecated, true);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('custom operationId for code-gen apps', async () => {
    const testRoutes = Hoek.clone(routes);
    testRoutes.options.plugins = {
      '@msimerson/hapi-openapi': {
        id: 'add'
      }
    };

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test'].post.operationId, 'add');
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('stop boolean creating parameter', async () => {
    const testRoutes = {
      method: 'GET',
      path: '/{name}',
      options: {
        handler: () => {},
        tags: ['api'],
        validate: {
          headers: Joi.boolean().truthy(),
          params: Joi.object({
            name: Joi.string().min(2)
          }),
          query: Joi.boolean().falsy()
        }
      }
    };

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/{name}'].get.parameters, [
      {
        name: 'name',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          minLength: 2
        }
      }
    ]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('stop empty objects creating parameter', async () => {
    const testRoutes = {
      method: 'POST',
      path: '/{name}',
      options: {
        handler: () => {},
        tags: ['api'],
        validate: {
          payload: Joi.object()
        }
      }
    };

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/{name}'].post.requestBody, {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Model1'
          }
        }
      }
    });

    // Before this test returned string: "'Validation failed. /paths/{name}/post is missing path parameter(s) for {name}"
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true); // TODO: it should be false since the parameter schema is missing, but the validator doesn't care
  });

  it('stop empty formData object creating parameter', async () => {
    const testRoutes = {
      method: 'POST',
      path: '/',
      options: {
        handler: () => {},
        tags: ['api'],
        validate: {
          payload: Joi.object()
        },
        plugins: {
          '@msimerson/hapi-openapi': {
            payloadType: 'form'
          }
        }
      }
    };

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.ok(response.result.paths['/'].post.parameters == null);

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('check if the property is hidden and swagger ui is visible', async () => {
    const testRoutes = {
      method: 'Get',
      path: '/todo/{id}/',
      options: {
        handler: () => {},
        tags: ['api'],
        validate: {
          params: Joi.object({
            id: Joi.number().required().description('the id for the todo item'),
            hidden: Joi.number().required().description('hidden item').meta({ swaggerHidden: true }),
            isVisible: Joi.boolean().required().description('must be visible on ui')
          })
        }
      }
    };

    const server = await Helper.createServer({ OAS: 'v3.0' }, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);
  });
});
