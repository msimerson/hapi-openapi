const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Helper = require('../helper.js');

after(() => Helper.cleanup());

describe('filter', () => {
  const routes = [
    {
      method: 'GET',
      path: '/no-tags',
      options: {
        handler: Helper.defaultHandler
      }
    },
    {
      method: 'GET',
      path: '/api-alpha-tag',
      options: {
        tags: ['api', 'alpha'],
        handler: Helper.defaultHandler
      }
    },
    {
      method: 'GET',
      path: '/api-beta-tag',
      options: {
        tags: ['api', 'beta'],
        handler: Helper.defaultHandler
      }
    },
    {
      method: 'GET',
      path: '/beta-tag',
      options: {
        tags: ['beta'],
        handler: Helper.defaultHandler
      }
    },
    {
      method: 'GET',
      path: '/api-alpha-gamma-tag',
      options: {
        tags: ['api', 'alpha', 'gamma'],
        handler: Helper.defaultHandler
      }
    }
  ];

  it('by `api` tag by default', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(Object.keys(response.result.paths).length, 3);
    assert.ok(response.result.paths['/api-beta-tag'] != null);
    assert.ok(response.result.paths['/api-alpha-tag'] != null);
    assert.ok(response.result.paths['/api-alpha-gamma-tag'] != null);
  });

  it('Query string params (alpha OR gamma), then by `routeTag` (api)', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json?tags=alpha,gamma' });
    assert.deepStrictEqual(Object.keys(response.result.paths).length, 2);
    assert.ok(response.result.paths['/api-alpha-tag'] != null);
    assert.ok(response.result.paths['/api-alpha-gamma-tag'] != null);
  });

  it('Query string params (beta), then by `routeTag` (function)', async () => {
    const server = await Helper.createServer({ routeTag: (tags) => !tags.includes('api') }, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json?tags=beta' });
    assert.deepStrictEqual(Object.keys(response.result.paths).length, 1);
    assert.ok(response.result.paths['/beta-tag'] != null);
  });

  it('Query string params (alpha OR beta) AND api, then by `routeTag` (api)', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({
      method: 'GET',
      url: `/swagger.json?tags=alpha,beta,${encodeURIComponent('+')}api`
    });
    assert.deepStrictEqual(Object.keys(response.result.paths).length, 3);
    assert.ok(response.result.paths['/api-alpha-tag'] != null);
    assert.ok(response.result.paths['/api-beta-tag'] != null);
    assert.ok(response.result.paths['/api-alpha-gamma-tag'] != null);
  });

  it('Query string params (alpha AND gamma), then by `routeTag` (api)', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({
      method: 'GET',
      url: `/swagger.json?tags=alpha,${encodeURIComponent('+')}gamma`
    });
    assert.deepStrictEqual(Object.keys(response.result.paths).length, 1);
    assert.ok(response.result.paths['/api-alpha-gamma-tag'] != null);
  });

  it('Query string params (alpha AND NOT gamma), then by `routeTag` (api)', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json?tags=alpha,-gamma' });
    assert.deepStrictEqual(Object.keys(response.result.paths).length, 1);
    assert.ok(response.result.paths['/api-alpha-tag'] != null);
  });

  it('by `routeTag` string if set', async () => {
    const server = await Helper.createServer({ routeTag: 'beta' }, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(Object.keys(response.result.paths).length, 2);
    assert.ok(response.result.paths['/api-beta-tag'] != null);
    assert.ok(response.result.paths['/beta-tag'] != null);
  });

  it('by `routeTag` function if set', async () => {
    const server = await Helper.createServer(
      { routeTag: (tags) => tags.includes('api') && tags.includes('beta') },
      routes
    );
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.paths).length, 1);
    assert.ok(response.result.paths['/api-beta-tag'] != null);
  });

  it('picks all routes if `routeTag` is set to () => true', async () => {
    const server = await Helper.createServer({ routeTag: () => true }, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.paths).length, routes.length);
    const documentedRoutes = Object.keys(response.result.paths);
    assert.strictEqual(
      documentedRoutes.some((route) => route.includes('swagger')),
      false
    );
  });

  it('picks all routes if `routeTag` is set to () => true, when jsonPath is not default', async () => {
    const jsonPath = '/testPath/swagger-test.json';
    const server = await Helper.createServer(
      {
        jsonPath,
        routeTag: () => true
      },
      routes
    );
    const response = await server.inject({ method: 'GET', url: jsonPath });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.paths).length, routes.length);
    const documentedRoutes = Object.keys(response.result.paths);
    assert.strictEqual(
      documentedRoutes.some((route) => route.includes('swagger')),
      false
    );
  });

  it('picks all routes if `routeTag` is set to () => true, when swaggerUIPath is not default', async () => {
    const swaggerUIPath = '/testPath';
    const server = await Helper.createServer(
      {
        swaggerUIPath,
        routeTag: () => true
      },
      routes
    );
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(Object.keys(response.result.paths).length, routes.length);
    const documentedRoutes = Object.keys(response.result.paths);
    assert.strictEqual(
      documentedRoutes.some((route) => route.includes('swagger')),
      false
    );
  });
});
