const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

describe('documentation-route-plugins', () => {
  const routes = [
    {
      method: 'GET',
      path: '/test',
      handler: Helper.defaultHandler
    }
  ];

  const testServer = async (swaggerOptions, plugins) => {
    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    const table = server.table();
    table.forEach((route) => {
      switch (route.path) {
        case '/test':
          break;
        case '/documentation':
          assert.deepStrictEqual(route.settings.plugins, plugins);
          break;
        case '/swagger.json':
          assert.deepStrictEqual(route.settings.plugins, { '@msimerson/hapi-openapi': false });
          break;
        case '/swaggerui/extend.js':
        case '/swaggerui/{path*}':
          assert.deepStrictEqual(route.settings.plugins, {});
          break;
        default:
          break;
      }
    });

    assert.deepStrictEqual(response.statusCode, 200);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  };

  it('should have no documentationRoutePlugins property', async () => {
    await testServer({}, {});
  });

  it('should have documentationRoutePlugins property passed', async () => {
    const swaggerOptions = {
      documentationRoutePlugins: {
        blankie: {
          fontSrc: ['self', 'fonts.gstatic.com', 'data:']
        }
      }
    };
    await testServer(swaggerOptions, swaggerOptions.documentationRoutePlugins);
  });

  it('should have multiple documentationRoutePlugins options', async () => {
    const swaggerOptions = {
      documentationRoutePlugins: {
        blankie: {
          fontSrc: ['self', 'fonts.gstatic.com', 'data:']
        },
        'simple-plugin': {
          isEnable: true
        }
      }
    };
    await testServer(swaggerOptions, swaggerOptions.documentationRoutePlugins);
  });
});
