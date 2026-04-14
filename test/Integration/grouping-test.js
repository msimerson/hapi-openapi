const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const HapiOpenapi = require('../../lib/index.js');
const Validate = require('../../lib/validate.js');

const testPlugin = {
  name: 'grouping1',
  register: (server) => {
    server.route({
      method: 'GET',
      path: '/grouping1',
      options: {
        handler: () => 'Hi from grouping 1',
        description: 'plugin1',
        tags: ['api', 'hello group', 'another group']
      }
    });
  }
};

const swaggerOptions = {
  schemes: ['http'],
  info: {
    title: 'Test API Documentation',
    description: 'This is a sample example of API documentation.',
    version: '1.0.0',
    termsOfService: 'https://github.com/msimerson/hapi-openapi/',
    contact: {
      email: 'glennjonesnet@gmail.com'
    },
    license: {
      name: 'MIT',
      url: 'https://raw.githubusercontent.com/msimerson/hapi-openapi/master/license.txt'
    }
  }
};

describe('default grouping', () => {
  it('group by path', async () => {
    const server = await new Hapi.Server({});
    await server.register([
      Inert,
      {
        plugin: testPlugin
      },
      {
        plugin: HapiOpenapi,
        options: swaggerOptions
      }
    ]);
    await server.initialize();

    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/grouping1'], {
      get: {
        tags: ['grouping1'],
        responses: {
          default: {
            schema: {
              type: 'string'
            },
            description: 'Successful'
          }
        },
        operationId: 'getGrouping1',
        summary: 'plugin1'
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  describe('tag grouping', () => {
    it('group by tags', async () => {
      const server = await new Hapi.Server({});
      swaggerOptions.grouping = 'tags';
      await server.register([
        Inert,
        testPlugin,
        {
          plugin: HapiOpenapi,
          options: swaggerOptions
        }
      ]);
      await server.initialize();
      const response = await server.inject({ method: 'GET', url: '/swagger.json' });
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(response.result.paths['/grouping1'], {
        get: {
          tags: ['hello group', 'another group'],
          responses: {
            default: {
              schema: {
                type: 'string'
              },
              description: 'Successful'
            }
          },
          operationId: 'getGrouping1',
          summary: 'plugin1'
        }
      });
      const isValid = await Validate.test(response.result);
      assert.strictEqual(isValid, true);
    });
  });

  describe('tag grouping with tagsGroupingFilter', () => {
    it('group by filtered tags', async () => {
      const server = await new Hapi.Server({});
      swaggerOptions.grouping = 'tags';
      swaggerOptions.tagsGroupingFilter = (tag) => tag === 'hello group';

      await server.register([
        Inert,
        testPlugin,
        {
          plugin: HapiOpenapi,
          options: swaggerOptions
        }
      ]);

      await server.initialize();
      const response = await server.inject({ method: 'GET', url: '/swagger.json' });

      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(response.result.paths['/grouping1'], {
        get: {
          tags: ['hello group'],
          responses: {
            default: {
              schema: {
                type: 'string'
              },
              description: 'Successful'
            }
          },
          operationId: 'getGrouping1',
          summary: 'plugin1'
        }
      });
      const isValid = await Validate.test(response.result);
      assert.strictEqual(isValid, true);
    });
  });
});
