const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

('use strict');

const Joi = require('joi');
const Helper = require('../helper.js');
const Validate = require('../../lib/validate.js');

describe('child-models', () => {
  const requestOptions = {
    method: 'GET',
    url: '/swagger.json',
    headers: {
      host: 'localhost'
    }
  };

  const routes = [
    {
      method: 'POST',
      path: '/foo/v1/bar',
      options: {
        description: '...',
        tags: ['api'],
        validate: {
          payload: Joi.object({
            outer1: Joi.object({
              inner1: Joi.string()
            }),
            outer2: Joi.object({
              inner2: Joi.string()
            })
          })
        },
        handler: function () {}
      }
    },
    {
      path: '/bar/objects',
      method: 'POST',
      options: {
        handler: function () {},
        tags: ['api'],
        response: {
          schema: Joi.object()
            .keys({
              foos: Joi.object()
                .keys({
                  foo: Joi.string().description('some foo')
                })
                .label('FooObj')
            })
            .label('FooObjParent')
        },
        validate: {
          payload: Joi.object()
            .keys({
              foos: Joi.object()
                .keys({
                  foo: Joi.string().description('some foo')
                })
                .label('FooObj')
            })
            .label('FooObjParent')
        }
      }
    },
    {
      path: '/bar/arrays',
      method: 'POST',
      options: {
        handler: function () {},
        tags: ['api'],
        response: {
          schema: Joi.array()
            .items(
              Joi.array()
                .items(Joi.object({ bar: Joi.string() }).label('FooArrObj'))
                .label('FooArr')
            )
            .label('FooArrParent')
        },
        validate: {
          payload: Joi.array()
            .items(
              Joi.array()
                .items(Joi.object({ bar: Joi.string() }).label('FooArrObj'))
                .label('FooArr')
            )
            .label('FooArrParent')
        }
      }
    }
  ];

  it('child definitions models', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject(requestOptions);

    assert.deepStrictEqual(response.statusCode, 200);

    assert.deepStrictEqual(response.result.paths['/foo/v1/bar'].post.parameters[0].schema, {
      $ref: '#/definitions/Model1'
    });

    assert.deepStrictEqual(response.result.definitions.Model1, {
      properties: {
        outer1: {
          $ref: '#/definitions/outer1'
        },
        outer2: {
          $ref: '#/definitions/outer2'
        }
      },
      type: 'object'
    });

    assert.deepStrictEqual(response.result.definitions.outer1, {
      properties: {
        inner1: {
          type: 'string'
        }
      },
      type: 'object'
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('object within an object - array within an array', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject(requestOptions);

    assert.deepStrictEqual(response.statusCode, 200);

    assert.deepStrictEqual(response.result.paths['/bar/objects'].post.parameters[0].schema, {
      $ref: '#/definitions/FooObjParent'
    });
    assert.deepStrictEqual(response.result.paths['/bar/objects'].post.responses[200].schema, {
      $ref: '#/definitions/FooObjParent'
    });
    assert.deepStrictEqual(response.result.definitions.FooObjParent, {
      type: 'object',
      properties: {
        foos: {
          $ref: '#/definitions/FooObj'
        }
      }
    });
    assert.deepStrictEqual(response.result.definitions.FooObj, {
      type: 'object',
      properties: {
        foo: {
          type: 'string',
          description: 'some foo'
        }
      }
    });

    assert.deepStrictEqual(response.result.paths['/bar/arrays'].post.parameters[0].schema, {
      $ref: '#/definitions/FooArrParent'
    });
    assert.deepStrictEqual(response.result.paths['/bar/arrays'].post.responses[200].schema, {
      $ref: '#/definitions/FooArrParent'
    });
    assert.deepStrictEqual(response.result.definitions.FooArrParent, {
      type: 'array',
      items: {
        $ref: '#/definitions/FooArr'
      }
    });
    assert.deepStrictEqual(response.result.definitions.FooArr, {
      type: 'array',
      items: {
        $ref: '#/definitions/FooArrObj'
      }
    });
    assert.deepStrictEqual(response.result.definitions.FooArrObj, {
      type: 'object',
      properties: {
        bar: {
          type: 'string'
        }
      }
    });
  });
});
