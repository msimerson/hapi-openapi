const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');

after(() => Helper.cleanup());

describe('debug', () => {
  const routesEmptyObjects = {
    method: 'POST',
    path: '/test/{id}',
    options: {
      handler: async () => {},
      tags: ['api'],
      validate: {
        headers: Joi.object(),
        params: Joi.object(),
        query: Joi.object(),
        payload: Joi.object()
      }
    }
  };

  const logs = [];
  before(async () => {
    const server = await Helper.createServer({ debug: true }, routesEmptyObjects);
    server.events.on('log', (event, tags) => {
      if (tags.error) {
        logs.push(event);
      }
    });
    await server.inject({ method: 'GET', url: '/swagger.json' });
  });

  it('log - Joi.object() with child properties', () => {
    assert.deepStrictEqual(
      logs[0].data,
      'The /test/{id} route params parameter was set, but not as a Joi.object() with child properties'
    );
    assert.deepStrictEqual(
      logs[1].data,
      'The /test/{id} route headers parameter was set, but not as a Joi.object() with child properties'
    );
    assert.deepStrictEqual(
      logs[2].data,
      'The /test/{id} route query parameter was set, but not as a Joi.object() with child properties'
    );
  });
});

describe('debug', () => {
  const routesFuncObjects = {
    method: 'POST',
    path: '/test/{id}',
    options: {
      handler: () => {},
      tags: ['api'],
      validate: {
        payload: (value) => {
          return value;
        },
        params: (value) => {
          return value;
        },
        query: (value) => {
          return value;
        },
        headers: (value) => {
          return value;
        }
      }
    }
  };

  const logs = [];
  before(async () => {
    const server = await Helper.createServer({ debug: true }, routesFuncObjects);
    server.events.on('log', (event, tags) => {
      if (tags.error || tags.warning) {
        logs.push(event);
      }
    });

    await server.inject({ method: 'GET', url: '/swagger.json' });
  });

  it('log - Joi.function for a query, header or payload ', () => {
    assert.deepStrictEqual(logs[0].data, 'Using a Joi.function for a query, header or payload is not supported.');
    assert.deepStrictEqual(logs[1].data, 'Using a Joi.function for a params is not supported and has been removed.');
    assert.deepStrictEqual(logs[2].data, 'Using a Joi.function for a query, header or payload is not supported.');
    assert.deepStrictEqual(logs[3].data, 'Using a Joi.function for a query, header or payload is not supported.');
  });
});

describe('debug', () => {
  const routesFuncObjects = {
    method: 'POST',
    path: '/test/{a}/{b?}',
    options: {
      handler: (request, reply) => {
        reply('ok');
      },
      tags: ['api'],
      validate: {
        params: Joi.object({
          a: Joi.string(),
          b: Joi.string()
        })
      }
    }
  };

  const logs = [];
  before(async () => {
    const server = await Helper.createServer({ debug: true }, routesFuncObjects);
    server.events.on('log', (event, tags) => {
      if (tags.warning) {
        logs.push(event);
      }
    });
    await server.inject({ method: 'GET', url: '/swagger.json' });
  });

  it('log - optional parameters breaking validation of JSON', () => {
    assert.deepStrictEqual(
      logs[0].data,
      'The /test/{a}/{b?} params parameter {b} is set as optional. This will work in the UI, but is invalid in the swagger spec'
    );
  });
});

it('debug page', async () => {
  const routes = {
    method: 'GET',
    path: '/test/',
    options: {
      handler: async () => {},
      tags: ['api']
    }
  };

  const server = await Helper.createServer({ debug: true }, routes);
  const response = await server.inject({ method: 'GET', url: '/documentation/debug' });
  assert.deepStrictEqual(response.statusCode, 200);
});
