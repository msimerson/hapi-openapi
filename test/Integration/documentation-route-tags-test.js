const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Helper = require('../helper.js');
const Validate = require('../../lib/validate.js');

describe('documentation-route-tags', () => {
  const routes = [
    {
      method: 'GET',
      path: '/test',
      handler: Helper.defaultHandler,
      options: {
        tags: ['api']
      }
    }
  ];

  const testServer = async (swaggerOptions, tagName) => {
    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    const table = server.table();
    table.forEach((route) => {
      switch (route.path) {
        case '/test':
          break;
        case '/swagger.json':
        case '/swaggerui/extend.js':
        case '/swaggerui/{path*}':
          assert.deepStrictEqual(route.settings.tags, tagName);
          break;
        default:
          break;
      }
    });

    assert.deepStrictEqual(response.statusCode, 200);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  };

  it('no documentationRouteTags property passed', async () => {
    await testServer({}, []);
  });

  it('documentationRouteTags property passed', async () => {
    const swaggerOptions = {
      documentationRouteTags: ['no-logging']
    };
    await testServer(swaggerOptions, swaggerOptions.documentationRouteTags);
  });

  it('multiple documentationRouteTags passed', async () => {
    const swaggerOptions = {
      documentationRouteTags: ['hello', 'world']
    };
    await testServer(swaggerOptions, swaggerOptions.documentationRouteTags);
  });
});
