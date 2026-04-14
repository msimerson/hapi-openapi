const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

const routes = [
  {
    method: 'GET',
    path: '/test',
    handler: Helper.defaultHandler,
    options: {
      tags: ['api']
    }
  },
  {
    method: 'GET',
    path: '/test2',
    handler: Helper.defaultHandler,
    options: {
      tags: ['api2']
    }
  },
  {
    method: 'GET',
    path: '/not-part-of-api',
    handler: Helper.defaultHandler,
    options: {
      tags: ['other']
    }
  }
];

const xPropertiesRoutes = [
  {
    method: 'POST',
    path: '/test',
    handler: Helper.defaultHandler,
    options: {
      tags: ['api'],
      validate: {
        payload: Joi.object({
          number: Joi.number().greater(10),
          string: Joi.string().alphanum(),
          array: Joi.array().items(Joi.string()).length(2)
        })
      }
    }
  }
];

const reuseModelsRoutes = [
  {
    method: 'POST',
    path: '/test',
    handler: Helper.defaultHandler,
    options: {
      tags: ['api'],
      validate: {
        payload: Joi.object({
          a: Joi.object({ a: Joi.string() }),
          b: Joi.object({ a: Joi.string() })
        })
      }
    }
  }
];

describe('builder', () => {
  it('defaults for swagger root object properties', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.swagger, '2.0');
    assert.deepStrictEqual(response.result.schemes, ['http']);
    assert.deepStrictEqual(response.result.basePath, '/');
    assert.ok(response.result.consumes == null);
    assert.ok(response.result.produces == null);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('set values for swagger root object properties', async () => {
    const swaggerOptions = {
      swagger: '5.9.45',
      schemes: ['https'],
      basePath: '/base',
      consumes: ['application/x-www-form-urlencoded'],
      produces: ['application/json', 'application/xml'],
      externalDocs: {
        description: 'Find out more about Hapi',
        url: 'http://hapijs.com'
      },
      'x-custom': 'custom'
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.swagger, '2.0');
    assert.deepStrictEqual(response.result.schemes, ['https']);
    assert.deepStrictEqual(response.result.basePath, '/base');
    assert.deepStrictEqual(response.result.consumes, ['application/x-www-form-urlencoded']);
    assert.deepStrictEqual(response.result.produces, ['application/json', 'application/xml']);
    assert.deepStrictEqual(response.result.externalDocs, swaggerOptions.externalDocs);
    assert.deepStrictEqual(response.result['x-custom'], 'custom');
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('xProperties : false', async () => {
    const server = await Helper.createServer({ xProperties: false }, xPropertiesRoutes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.result.definitions, {
      array: {
        type: 'array',
        items: {
          type: 'string'
        }
      },
      Model1: {
        type: 'object',
        properties: {
          number: {
            type: 'number'
          },
          string: {
            type: 'string'
          },
          array: {
            $ref: '#/definitions/array'
          }
        }
      }
    });

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('xProperties : true', async () => {
    const server = await Helper.createServer({ xProperties: true }, xPropertiesRoutes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.result.definitions, {
      array: {
        type: 'array',
        'x-constraint': {
          length: 2
        },
        items: {
          type: 'string'
        }
      },
      Model1: {
        type: 'object',
        properties: {
          number: {
            type: 'number',
            'x-constraint': {
              greater: 10
            }
          },
          string: {
            type: 'string',
            'x-format': {
              alphanum: true
            }
          },
          array: {
            $ref: '#/definitions/array'
          }
        }
      }
    });

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('reuseDefinitions : true. It should not be reused, because of the exact definition, but a different label.', async () => {
    const server = await Helper.createServer({ reuseDefinitions: true }, reuseModelsRoutes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.result.definitions, {
      a: {
        type: 'object',
        properties: {
          a: {
            type: 'string'
          }
        }
      },
      b: {
        type: 'object',
        properties: {
          a: {
            type: 'string'
          }
        }
      },
      Model1: {
        type: 'object',
        properties: {
          a: {
            $ref: '#/definitions/a'
          },
          b: {
            $ref: '#/definitions/b'
          }
        }
      }
    });

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('reuseDefinitions : false', async () => {
    const server = await Helper.createServer({ reuseDefinitions: false }, reuseModelsRoutes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    //console.log(JSON.stringify(response.result));
    assert.deepStrictEqual(response.result.definitions, {
      a: {
        type: 'object',
        properties: {
          a: {
            type: 'string'
          }
        }
      },
      b: {
        type: 'object',
        properties: {
          a: {
            type: 'string'
          }
        }
      },
      Model1: {
        type: 'object',
        properties: {
          a: {
            $ref: '#/definitions/a'
          },
          b: {
            $ref: '#/definitions/b'
          }
        }
      }
    });

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('getSwaggerJSON determines host and port from request info', async () => {
    const server = await Helper.createServer({});

    const response = await server.inject({
      method: 'GET',
      headers: { host: '194.148.15.24:7645' },
      url: '/swagger.json'
    });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.host, '194.148.15.24:7645');
  });

  it('getSwaggerJSON doesn\'t specify port from request info when port is default', async () => {
    const server = await Helper.createServer({});

    const response = await server.inject({
      method: 'GET',
      headers: { host: '194.148.15.24' },
      url: '/swagger.json'
    });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.host, '194.148.15.24');
  });

  it('routeTag : "api"', async () => {
    const server = await Helper.createServer({ routeTag: 'api' }, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.result.paths['/test'], {
      get: {
        operationId: 'getTest',
        responses: {
          default: {
            description: 'Successful',
            schema: {
              type: 'string'
            }
          }
        },
        tags: ['test']
      }
    });
    assert.deepStrictEqual(response.result.paths['/test2'], undefined);
    assert.deepStrictEqual(response.result.paths['/not-part-of-api'], undefined);

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('routeTag : "api2"', async () => {
    const server = await Helper.createServer({ routeTag: 'api2' }, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.result.paths['/test'], undefined);
    assert.deepStrictEqual(response.result.paths['/test2'], {
      get: {
        operationId: 'getTest2',
        responses: {
          default: {
            description: 'Successful',
            schema: {
              type: 'string'
            }
          }
        },
        tags: ['test2']
      }
    });
    assert.deepStrictEqual(response.result.paths['/not-part-of-api'], undefined);

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });
});

describe('builder', () => {
  let logs = [];
  before(async () => {
    const server = await Helper.createServer({ debug: true }, reuseModelsRoutes);

    return new Promise((resolve) => {
      server.events.on('log', (event) => {
        logs = event.tags;
        //console.log(event);
        if (event.data === 'PASSED - The swagger.json validation passed.') {
          logs = event.tags;
          resolve();
        }
      });
      server.inject({ method: 'GET', url: '/swagger.json' });
    });
  });

  it('debug : true', () => {
    assert.deepStrictEqual(logs, ['hapi-openapi', 'validation', 'info']);
  });
});

describe('fix issue 711', () => {
  it('The description field is shown when an object is empty', async () => {
    const routes = {
      method: 'POST',
      path: '/todo/{id}/',
      options: {
        handler: () => {},
        description: 'Test',
        notes: 'Test notes',
        tags: ['api'],
        validate: {
          payload: Joi.object().description('MyDescription').label('MySchema')
        }
      }
    };

    const server = await Helper.createServer({ debug: true }, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);

    const { MySchema } = response.result.definitions;
    assert.notDeepStrictEqual(MySchema, { type: 'object' });
    assert.deepStrictEqual(MySchema, { type: 'object', description: 'MyDescription' });
  });
});
