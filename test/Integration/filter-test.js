const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Helper = require('../helper.js');
const Validate = require('../../lib/validate.js');

describe('filter', () => {
  const routes = [
    {
      method: 'GET',
      path: '/actors',
      handler: Helper.defaultHandler,
      options: {
        tags: ['api']
      }
    },
    {
      method: 'GET',
      path: '/movies',
      handler: Helper.defaultHandler,
      options: {
        tags: ['api', 'a']
      }
    },
    {
      method: 'GET',
      path: '/movies/movie',
      handler: Helper.defaultHandler,
      options: {
        tags: ['api', 'b', 'a']
      }
    },
    {
      method: 'GET',
      path: '/movies/movie/director',
      handler: Helper.defaultHandler,
      options: {
        tags: ['api', 'a']
      }
    },
    {
      method: 'GET',
      path: '/movies/movie/actor',
      handler: Helper.defaultHandler,
      options: {
        tags: ['api', 'c']
      }
    },
    {
      method: 'GET',
      path: '/movies/movie/actors',
      handler: Helper.defaultHandler,
      options: {
        tags: ['api', 'd']
      }
    }
  ];

  it('filter by tags=a', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json?tags=a' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.strictEqual(response.result.paths.length ?? Object.keys(response.result.paths).length, 3);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('filter by tags=a,b,c,d', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json?tags=a,b,c,d' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.strictEqual(response.result.paths.length ?? Object.keys(response.result.paths).length, 5);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('filter by tags=a,c', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json?tags=a,c' });

    //console.log(JSON.stringify(response.result.paths));
    assert.deepStrictEqual(response.statusCode, 200);
    assert.strictEqual(response.result.paths.length ?? Object.keys(response.result.paths).length, 4);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('filter by tags=a,-b', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json?tags=a,-b' });

    //console.log(JSON.stringify(response.result.paths));
    assert.deepStrictEqual(response.statusCode, 200);
    assert.strictEqual(response.result.paths.length ?? Object.keys(response.result.paths).length, 2);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('filter by tags=a,+b', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json?tags=a,%2Bb' });
    // note %2B is a '+' plus char url encoded
    assert.deepStrictEqual(response.statusCode, 200);
    assert.strictEqual(response.result.paths.length ?? Object.keys(response.result.paths).length, 1);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('filter by tags=a,+c', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json?tags=a,%2Bc' });

    // note %2B is a '+' plus char url encoded

    //console.log(JSON.stringify(response.result.paths));
    assert.deepStrictEqual(response.statusCode, 200);
    assert.strictEqual(response.result.paths.length ?? Object.keys(response.result.paths).length, 0);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('filter by tags=x', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json?tags=x' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.strictEqual(response.result.paths.length ?? Object.keys(response.result.paths).length, 0);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });
});
