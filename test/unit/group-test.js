const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Group = require('../../lib/group.js');
const Helper = require('../helper.js');

after(() => Helper.cleanup());

describe('group', () => {
  const routes = [
    {
      method: 'GET',
      path: '/actors',
      options: {
        tags: ['api'],
        handler: Helper.defaultHandler
      }
    },
    {
      method: 'GET',
      path: '/movies',
      options: {
        tags: ['api'],
        handler: Helper.defaultHandler
      }
    },
    {
      method: 'GET',
      path: '/movies/movie',
      options: {
        tags: ['api'],
        handler: Helper.defaultHandler
      }
    },
    {
      method: 'GET',
      path: '/movies/movie/actor',
      options: {
        tags: ['api'],
        handler: Helper.defaultHandler
      }
    }
  ];

  it('test groups tagging of paths', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/actors'].get.tags[0], 'actors');
    assert.deepStrictEqual(response.result.paths['/movies'].get.tags[0], 'movies');
    assert.deepStrictEqual(response.result.paths['/movies/movie'].get.tags[0], 'movies');
    assert.deepStrictEqual(response.result.paths['/movies/movie/actor'].get.tags[0], 'movies');
  });

  it('getNameByPath 1', () => {
    const name = Group.getNameByPath(1, '/', '/lala/foo');
    assert.deepStrictEqual(name, 'lala');
  });

  it('getNameByPath 2', () => {
    const name = Group.getNameByPath(1, '/', '/');
    assert.deepStrictEqual(name, '');
  });

  it('getNameByPath 3', () => {
    const name = Group.getNameByPath(2, '/', '/lala/foo');
    assert.deepStrictEqual(name, 'lala/foo');
  });

  it('getNameByPath 4', () => {
    const name = Group.getNameByPath(2, '/', '/lala/foo/blah');
    assert.deepStrictEqual(name, 'lala/foo');
  });

  it('getNameByPath 5', () => {
    const name = Group.getNameByPath(2, '/', '/lala');
    assert.deepStrictEqual(name, 'lala');
  });

  it('getNameByPath with basePath = /v3/', () => {
    const name = Group.getNameByPath(2, '/v3/', '/v3/lala');
    assert.deepStrictEqual(name, 'lala');
  });

  it('getNameByPath with basePath = /v3/', () => {
    const name = Group.getNameByPath(2, '/v3/', '/v3/lala/foo');
    assert.deepStrictEqual(name, 'lala');
  });

  it('getNameByPath with basePath = /v3', () => {
    const name = Group.getNameByPath(2, '/v3', '/v3/lala/foo');
    assert.deepStrictEqual(name, 'lala');
  });
});
