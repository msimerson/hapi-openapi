const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Helper = require('../helper.js');
const Validate = require('../../lib/validate.js');

describe('info', () => {
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

  it('no info object passed', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.info, { title: 'API documentation', version: '0.0.1' });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('no info title property passed', async () => {
    const swaggerOptions = {
      info: {}
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.info, { title: 'API documentation', version: '0.0.1' });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('min valid info object', async () => {
    const swaggerOptions = {
      info: {
        title: 'test title for lab',
        version: '0.0.1'
      }
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.info, swaggerOptions.info);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('full info object', async () => {
    const swaggerOptions = {
      info: {
        title: 'Swagger Petstore',
        description: 'This is a sample server Petstore server.',
        version: '1.0.0',
        termsOfService: 'http://swagger.io/terms/',
        contact: {
          email: 'apiteam@swagger.io'
        },
        license: {
          name: 'Apache 2.0',
          url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
        }
      }
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.info, swaggerOptions.info);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('info object with custom properties', async () => {
    const swaggerOptions = {
      info: {
        title: 'test title for lab',
        version: '0.0.1',
        'x-custom': 'custom'
      }
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.info, swaggerOptions.info);
  });
});
