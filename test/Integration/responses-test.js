const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');
const Defaults = require('../../lib/defaults.js');
const Responses = require('../../lib/responses.js');
const Validate = require('../../lib/validate.js');

const responses = new Responses(Defaults);

describe('responses', () => {
  const headers = {
    'X-Rate-Limit-Limit': {
      description: 'The number of allowed requests in the current period',
      type: 'integer'
    },
    'X-Rate-Limit-Remaining': {
      description: 'The number of remaining requests in the current period',
      type: 'integer'
    },
    'X-Rate-Limit-Reset': {
      description: 'The number of seconds left in the current period',
      type: 'integer'
    }
  };

  const examples = {
    'application/json': {
      a: 5,
      b: 5,
      operator: '+',
      equals: 10
    }
  };

  const err400 = Joi.object().description('Bad Request').meta({ headers, examples });
  const err404 = Joi.object().description('Unsupported Media Type').meta({ headers, examples });
  const err429 = Joi.object().description('Too Many Requests').meta({ headers, examples });
  const err500 = Joi.object().description('Internal Server Error').meta({ headers, examples });

  const joiSumModel = Joi.object({
    id: Joi.string().required().example('x78P9c'),
    a: Joi.number().required().example(5),
    b: Joi.number().required().example(5),
    operator: Joi.string().required().description('either +, -, /, or *').example('+'),
    equals: Joi.number().required().example(10),
    created: Joi.string().required().isoDate().description('ISO date string').example('2015-12-01'),
    modified: Joi.string().isoDate().description('ISO date string').example('2015-12-01')
  })
    .description('json body for sum')
    .label('Sum');

  const joiListModel = Joi.object({
    items: Joi.array().items(joiSumModel),
    count: Joi.number().required(),
    pageSize: Joi.number().required(),
    page: Joi.number().required(),
    pageCount: Joi.number().required()
  }).label('List');

  const standardHTTP = {
    200: {
      description: 'Success',
      schema: joiSumModel,
      headers
    },
    400: {
      description: 'Bad Request',
      headers
    },
    429: {
      description: 'Too Many Requests',
      headers
    },
    500: {
      description: 'Internal Server Error',
      headers
    }
  };

  it('using hapi response.schema', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            a: Joi.number().required().description('the first number')
          })
        },
        payload: {
          maxBytes: 1048576,
          parse: true,
          output: 'stream'
        },
        response: { schema: joiSumModel }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.ok(response.result.paths['/store/'].post.responses != null);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('conditional variables produce `required = true`, not `required = [...]`', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          query: Joi.object({
            nonce: Joi.string().when('response_type', {
              is: /^id_token( token)?$/,
              then: Joi.required()
            }),
            response_type: Joi.string().allow('@hapi/code', 'id_token token', 'id_token').required()
          })
        }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters[0].required, true);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('using hapi response.schema with child objects', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            a: Joi.number().required().description('the first number')
          })
        },
        payload: {
          maxBytes: 1048576,
          parse: true,
          output: 'stream'
        },
        response: { schema: joiListModel }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.ok(response.result.definitions.List != null);
    assert.ok(response.result.definitions.Sum != null);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('using hapi response.status', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            a: Joi.number().required().description('the first number')
          })
        },
        response: {
          status: {
            200: joiSumModel,
            204: undefined,
            400: err400,
            404: err404,
            429: err429,
            500: err500
          }
        }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.ok(response.result.paths['/store/'].post.responses[200] != null);
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[204].description, 'No Content');
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[400].description, 'Bad Request');
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[400].headers, headers);
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[400].examples, examples);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('using hapi response.status without 200', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            a: Joi.number().required().description('the first number')
          })
        },
        response: {
          status: {
            400: err400,
            404: err404,
            429: err429,
            500: err500
          }
        }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[200], undefined);
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[400].description, 'Bad Request');
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[400].headers, headers);
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[400].examples, examples);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('using route base plugin override - object', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        plugins: {
          '@msimerson/hapi-openapi': {
            responses: standardHTTP
          }
        },
        validate: {
          payload: Joi.object({
            a: Joi.number().required().description('the first number')
          })
        }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.ok(response.result.paths['/store/'].post.responses[200].schema != null);
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[400].description, 'Bad Request');
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[400].headers, headers);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('using route merging response and plugin override', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      handler: Helper.defaultHandler,
      options: {
        tags: ['api'],
        response: {
          schema: Joi.object().keys({ test: Joi.string() }).label('Result')
        },
        plugins: {
          '@msimerson/hapi-openapi': {
            responses: {
              200: {
                description: 'Success its a 200',
                'x-meta': 'x-meta test data'
              }
            }
          }
        }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.ok(response.result.paths['/store/'].post.responses[200].schema != null);
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[200].description, 'Success its a 200');
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[200]['x-meta'], 'x-meta test data');
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[200].schema, {
      $ref: '#/definitions/Result'
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('test a default response description is provided when no description is given', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      handler: Helper.defaultHandler,
      options: {
        tags: ['api'],
        plugins: {
          '@msimerson/hapi-openapi': {
            responses: {
              200: {
                'x-meta': 'x-meta test data'
              }
            }
          }
        }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[200].description, 'Successful');
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('using route base plugin override - array', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        plugins: {
          '@msimerson/hapi-openapi': {
            responses: {
              200: {
                description: 'Success',
                schema: Joi.array()
                  .items(
                    Joi.object({
                      equals: Joi.number()
                    }).label('HTTP200Items')
                  )
                  .label('HTTP200')
              },
              400: {
                description: 'Bad Request',
                schema: Joi.array()
                  .items(
                    Joi.object({
                      equals: Joi.string()
                    })
                  )
                  .label('HTTP400')
              }
            }
          }
        },
        validate: {
          payload: Joi.object({
            a: Joi.number().required().description('the first number')
          }).label('Payload')
        }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[200], {
      description: 'Success',
      schema: {
        $ref: '#/definitions/HTTP200'
      }
    });
    assert.deepStrictEqual(response.result.definitions.HTTP200, {
      type: 'array',
      items: {
        $ref: '#/definitions/HTTP200Items'
      }
    });
    assert.deepStrictEqual(response.result.definitions.HTTP200Items, {
      type: 'object',
      properties: {
        equals: {
          type: 'number'
        }
      }
    });
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses[400].description, 'Bad Request');
    assert.ok(response.result.definitions.HTTP400 != null);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('failback to 200', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            a: Joi.number().required().description('the first number')
          })
        }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses, {
      default: {
        schema: {
          type: 'string'
        },
        description: 'Successful'
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('when default schema provided an no responses provided', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            a: Joi.number().required().description('the first number')
          })
        },
        response: {
          schema: joiListModel
        }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.deepStrictEqual(response.result.paths['/store/'].post.responses, {
      200: {
        schema: {
          $ref: '#/definitions/List'
        },
        description: 'Successful'
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('No ownProperty', () => {
    const objA = Helper.objWithNoOwnProperty();
    const objB = Helper.objWithNoOwnProperty();
    const objC = Helper.objWithNoOwnProperty();

    assert.deepStrictEqual(responses.build({}, {}, {}, {}), {
      default: {
        schema: {
          type: 'string'
        },
        description: 'Successful'
      }
    });
    assert.deepStrictEqual(responses.build(objA, objB, objC, {}), {
      default: {
        schema: {
          type: 'string'
        },
        description: 'Successful'
      }
    });

    const objD = { 200: { description: 'Successful' } };
    assert.deepStrictEqual(responses.build(objD, objB, objC, {}), {
      200: {
        schema: {
          type: 'string'
        },
        description: 'Successful'
      }
    });
  });

  it('with same path but different method', async () => {
    const routes = [
      {
        method: 'POST',
        path: '/path/two',
        options: {
          tags: ['api'],
          handler: Helper.defaultHandler,
          response: {
            schema: Joi.object({
              value1111: Joi.boolean()
            })
          }
        }
      },
      {
        method: 'GET',
        path: '/path/two',
        options: {
          tags: ['api'],
          handler: Helper.defaultHandler,
          response: {
            schema: Joi.object({
              value2222: Joi.boolean()
            })
          }
        }
      }
    ];

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.ok(response.result.definitions.Model1 != null);
    assert.ok(response.result.definitions.Model2 != null);
    assert.deepStrictEqual(response.result.definitions, {
      Model1: {
        type: 'object',
        properties: {
          value2222: {
            type: 'boolean'
          }
        }
      },
      Model2: {
        type: 'object',
        properties: {
          value1111: {
            type: 'boolean'
          }
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('with deep labels', async () => {
    const routes = [
      {
        method: 'POST',
        path: '/path/two',
        options: {
          tags: ['api'],
          handler: Helper.defaultHandler,
          response: {
            schema: Joi.object({
              value1111: Joi.boolean()
            }).label('labelA')
          }
        }
      }
    ];

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.ok(response.result.definitions.labelA != null);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('array with required #249', async () => {
    const dataPointSchema = Joi.object()
      .keys({
        date: Joi.date().required(),
        value: Joi.number().required()
      })
      .label('datapoint')
      .required();

    const exampleSchema = Joi.array().items(dataPointSchema).label('datapointlist').required();

    const routes = [
      {
        method: 'POST',
        path: '/path/two',
        options: {
          tags: ['api'],
          handler: Helper.defaultHandler,
          response: { schema: exampleSchema }
        }
      }
    ];

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.ok(response.result.definitions.datapoint != null);
    assert.deepStrictEqual(response.result.definitions, {
      datapoint: {
        properties: {
          date: {
            type: 'string',
            format: 'date'
          },
          value: {
            type: 'number'
          }
        },
        required: ['date', 'value'],
        type: 'object'
      },
      datapointlist: {
        type: 'array',
        items: {
          $ref: '#/definitions/datapoint'
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('replace example with x-example for response', async () => {
    const dataPointSchema = Joi.object()
      .keys({
        date: Joi.date().required().example('2016-08-26'),
        value: Joi.number().required().example('1024')
      })
      .label('datapoint')
      .required();

    const exampleSchema = Joi.array().items(dataPointSchema).label('datapointlist').required();

    const routes = [
      {
        method: 'POST',
        path: '/path/two',
        options: {
          tags: ['api'],
          handler: Helper.defaultHandler,
          response: { schema: exampleSchema }
        }
      }
    ];

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.ok(response.result.definitions.datapoint != null);
    assert.deepStrictEqual(response.result.definitions, {
      datapoint: {
        properties: {
          date: {
            type: 'string',
            format: 'date',
            example: '2016-08-26'
          },
          value: {
            type: 'number',
            example: '1024'
          }
        },
        required: ['date', 'value'],
        type: 'object'
      },
      datapointlist: {
        type: 'array',
        items: {
          $ref: '#/definitions/datapoint'
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('using hapi response.schema and plugin ', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        plugins: {
          '@msimerson/hapi-openapi': {
            responses: {
              200: {
                description: 'Success with response.schema'
              }
            }
          }
        },
        response: { schema: joiListModel }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.deepStrictEqual(response.result.paths, {
      '/store/': {
        post: {
          operationId: 'postStore',
          tags: ['store'],
          responses: {
            200: {
              schema: {
                $ref: '#/definitions/List'
              },
              description: 'Success with response.schema'
            }
          }
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('using hapi response.schema and plugin mismatch', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        plugins: {
          '@msimerson/hapi-openapi': {
            responses: {
              404: {
                description: 'Could not find a schema'
              }
            }
          }
        },
        response: { schema: joiListModel }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.deepStrictEqual(response.result.paths, {
      '/store/': {
        post: {
          operationId: 'postStore',
          tags: ['store'],
          responses: {
            200: {
              schema: {
                $ref: '#/definitions/List'
              },
              description: 'Successful'
            },
            404: {
              description: 'Could not find a schema'
            }
          }
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('using hapi response.schema and plugin mismatch', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        plugins: {
          '@msimerson/hapi-openapi': {
            responses: {
              200: {
                description: 'Success with response.schema',
                schema: joiSumModel
              }
            }
          }
        },
        response: { schema: joiListModel }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.deepStrictEqual(response.result.paths, {
      '/store/': {
        post: {
          operationId: 'postStore',
          tags: ['store'],
          responses: {
            200: {
              schema: {
                $ref: '#/definitions/Sum'
              },
              description: 'Success with response.schema'
            }
          }
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('using hapi response.schema and plugin mixed results', async () => {
    const routes = {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        plugins: {
          '@msimerson/hapi-openapi': {
            responses: {
              400: {
                description: '400 - Added from plugin-options'
              },
              404: {
                schema: Joi.object({ err: Joi.string() })
              },
              500: {
                description: '500 - Added from plugin-options'
              }
            }
          }
        },
        response: {
          status: {
            200: joiSumModel,
            400: Joi.object({ err: Joi.string() }),
            404: Joi.object({ err: Joi.string() }).description('404 from response status object'),
            429: Joi.object({ err: Joi.string() })
          }
        }
      }
    };

    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ url: '/swagger.json' });
    assert.deepStrictEqual(response.result.paths, {
      '/store/': {
        post: {
          operationId: 'postStore',
          tags: ['store'],
          responses: {
            200: {
              description: 'json body for sum',
              schema: {
                $ref: '#/definitions/Sum'
              }
            },
            400: {
              description: '400 - Added from plugin-options',
              schema: {
                $ref: '#/definitions/Model1'
              }
            },
            404: {
              description: '404 from response status object',
              schema: {
                $ref: '#/definitions/Model4'
              }
            },
            429: {
              description: 'Too Many Requests',
              schema: {
                $ref: '#/definitions/Model3'
              }
            },
            500: {
              description: '500 - Added from plugin-options'
            }
          }
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });
});
