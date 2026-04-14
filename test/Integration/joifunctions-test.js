const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

describe('validation', () => {
  const routes = {
    method: 'POST',
    path: '/test',
    handler: Helper.defaultHandler,
    options: {
      description: 'Add sum',
      notes: ['Adds a sum to the data store'],
      tags: ['api'],
      validate: {
        payload: (value) => {
          console.log('testing');
          return value;
        },
        // params: async (value) => {

        //     console.log('testing');
        //     return value;
        // },
        query: (value) => {
          console.log('testing');
          return value;
        },
        headers: (value) => {
          console.log('testing');
          return value;
        }
      }
    }
  };

  it('function not joi', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test'].post.parameters, [
      {
        type: 'string',
        name: 'Hidden Model',
        in: 'header'
      },
      {
        type: 'string',
        name: 'Hidden Model',
        in: 'query'
      },
      {
        in: 'body',
        name: 'body',
        schema: {
          $ref: '#/definitions/Hidden%20Model'
        }
      }
    ]);
    assert.deepStrictEqual(response.result.definitions, {
      'Hidden Model': {
        type: 'object'
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });
});
