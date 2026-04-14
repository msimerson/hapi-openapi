const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Validate = require('../../lib/validate.js');

const swaggerJSON = {
  swagger: '2.0',
  host: 'localhost:3000',
  basePath: '/v1',
  schemes: ['http'],
  info: {
    title: 'Test API Documentation',
    version: '7.0.0'
  },
  paths: {
    '/test': {
      post: {
        operationId: 'postTest',
        parameters: [
          {
            in: 'body',
            name: 'body',
            schema: {
              $ref: '#/definitions/Model1'
            }
          }
        ],
        tags: ['test'],
        responses: {
          default: {
            schema: {
              type: 'string'
            },
            description: 'Successful'
          }
        }
      }
    }
  },
  definitions: {
    Model1: {
      type: 'object',
      properties: {
        a: {
          type: 'string'
        }
      }
    }
  }
};

const openAPIJSON = {
  openapi: '3.0.0',
  servers: [{ url: 'http://localhost:3000/v1' }],
  info: {
    title: 'Test API Documentation',
    version: '7.0.0'
  },
  paths: {
    '/test': {
      post: {
        operationId: 'postTest',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Model1'
              }
            }
          }
        },
        tags: ['test'],
        responses: {
          default: {
            content: {
              'application/json': {
                schema: {
                  type: 'string'
                }
              }
            },
            description: 'Successful'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Model1: {
        type: 'object',
        properties: {
          a: {
            type: 'string'
          }
        }
      }
    }
  }
};

[swaggerJSON, openAPIJSON].forEach((json) => {
  describe('validate - log ', () => {
    it('bad schema', async () => {
      const cb = (tags) => {
        assert.deepStrictEqual(tags, ['validation', 'error']);
      };

      const isValid = await Validate.log({}, cb);
      assert.strictEqual(isValid, false);
    });

    it('good schema', async () => {
      const cb = (tags) => {
        assert.deepStrictEqual(tags, ['validation', 'info']);
      };

      const isValid = await Validate.log(json, cb);
      assert.strictEqual(isValid, true);
    });
  });

  describe('validate - test ', () => {
    it('bad schema', async () => {
      const status = await Validate.test({});
      assert.deepStrictEqual(status, false);
    });

    it('good schema', async () => {
      const status = await Validate.test(json);
      assert.deepStrictEqual(status, true);
    });
  });
});
