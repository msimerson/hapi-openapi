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
  it('defaults for openapi root object properties', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0' }, routes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.openapi, '3.0.0');
    assert.strictEqual(response.result.servers.length ?? Object.keys(response.result.servers).length, 1);
    assert.deepStrictEqual(Object.keys(response.result.servers[0]).sort(), [].concat('url').sort());
    assert.strictEqual(typeof response.result.servers[0].url, 'string');
    assert.ok(response.result.servers[0].url.startsWith('http://'));
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('set values for openapi root object properties', async () => {
    const swaggerOptions = {
      OAS: 'v3.0',
      servers: [{ url: 'https://server/base' }],
      consumes: ['application/x-www-form-urlencoded'],
      produces: ['application/json', 'application/xml'],
      externalDocs: {
        description: 'Find out more about Hapi',
        url: 'http://hapijs.com'
      },
      'x-custom': 'custom'
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.openapi, '3.0.0');
    assert.deepStrictEqual(response.result.servers, [{ url: 'https://server/base' }]);
    assert.ok(response.result.consumes == null); // .equal(['application/x-www-form-urlencoded']);
    assert.ok(response.result.produces == null); // to.equal(['application/json', 'application/xml']);
    assert.deepStrictEqual(response.result.externalDocs, swaggerOptions.externalDocs);
    assert.deepStrictEqual(response.result['x-custom'], 'custom');
    assert.deepStrictEqual(response.result.paths['/test'].get.responses, {
      default: {
        description: 'Successful',
        content: {
          'application/json': {
            schema: {
              type: 'string'
            }
          },
          'application/xml': {
            schema: {
              type: 'string'
            }
          }
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('xProperties : false', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0', xProperties: false }, xPropertiesRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.result.components.schemas, {
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
            $ref: '#/components/schemas/array'
          }
        }
      }
    });

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('xProperties : true', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0', xProperties: true }, xPropertiesRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.result.components.schemas, {
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
            $ref: '#/components/schemas/array'
          }
        }
      }
    });

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('reuseDefinitions : true. It should not be reused, because of the exact definition, but a different label.', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0', reuseDefinitions: true }, reuseModelsRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.result.components.schemas, {
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
            $ref: '#/components/schemas/a'
          },
          b: {
            $ref: '#/components/schemas/b'
          }
        }
      }
    });

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('reuseDefinitions : false', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0', reuseDefinitions: false }, reuseModelsRoutes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    //console.log(JSON.stringify(response.result));
    assert.deepStrictEqual(response.result.components.schemas, {
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
            $ref: '#/components/schemas/a'
          },
          b: {
            $ref: '#/components/schemas/b'
          }
        }
      }
    });

    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('getSwaggerJSON determines host and port from request info', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0' });

    const response = await server.inject({
      method: 'GET',
      headers: { host: '194.148.15.24:7645' },
      url: '/openapi.json'
    });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.servers, [{ url: 'http://194.148.15.24:7645' }]);
  });

  it('getSwaggerJSON doesn\'t specify port from request info when port is default', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0' });

    const response = await server.inject({
      method: 'GET',
      headers: { host: '194.148.15.24' },
      url: '/openapi.json'
    });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.servers, [{ url: 'http://194.148.15.24' }]);
  });

  it('routeTag : "api"', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0', routeTag: 'api' }, routes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.result.paths['/test'], {
      get: {
        operationId: 'getTest',
        responses: {
          default: {
            description: 'Successful',
            content: {
              'application/json': {
                schema: {
                  type: 'string'
                }
              }
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
    const server = await Helper.createServer({ OAS: 'v3.0', routeTag: 'api2' }, routes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });

    assert.deepStrictEqual(response.result.paths['/test'], undefined);
    assert.deepStrictEqual(response.result.paths['/test2'], {
      get: {
        operationId: 'getTest2',
        responses: {
          default: {
            description: 'Successful',
            content: {
              'application/json': {
                schema: {
                  type: 'string'
                }
              }
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
    const server = await Helper.createServer({ OAS: 'v3.0', debug: true }, reuseModelsRoutes);

    return new Promise((resolve) => {
      server.events.on('log', (event) => {
        logs = event.tags;
        //console.log(event);
        if (event.data === 'PASSED - The swagger.json validation passed.') {
          logs = event.tags;
          resolve();
        }
      });
      server.inject({ method: 'GET', url: '/openapi.json' });
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

    const server = await Helper.createServer({ OAS: 'v3.0', debug: true }, routes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);

    const { MySchema } = response.result.components.schemas;
    assert.notDeepStrictEqual(MySchema, { type: 'object' });
    assert.deepStrictEqual(MySchema, { type: 'object', description: 'MyDescription' });
  });
});
