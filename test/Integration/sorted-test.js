const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Helper = require('../helper.js');
const Validate = require('../../lib/validate.js');

const versions = ['v2', 'v3.0'];

versions.forEach((version) => {
  describe(`OAS ${version}`, () => {
    describe('sort', () => {
      const routes = [
        {
          method: 'POST',
          path: '/x',
          options: {
            tags: ['api'],
            handler: Helper.defaultHandler,
            plugins: {
              '@msimerson/hapi-openapi': {
                order: 7
              }
            }
          }
        },
        {
          method: 'GET',
          path: '/b',
          options: {
            tags: ['api'],
            handler: Helper.defaultHandler,
            plugins: {
              '@msimerson/hapi-openapi': {
                order: 5
              }
            }
          }
        },
        {
          method: 'GET',
          path: '/b/c',
          options: {
            tags: ['api'],
            handler: Helper.defaultHandler,
            plugins: {
              '@msimerson/hapi-openapi': {
                order: 4
              }
            }
          }
        },
        {
          method: 'POST',
          path: '/b/c/d',
          options: {
            tags: ['api'],
            handler: Helper.defaultHandler,
            plugins: {
              '@msimerson/hapi-openapi': {
                order: 1
              }
            }
          }
        },
        {
          method: 'GET',
          path: '/b/c/d',
          options: {
            tags: ['api'],
            handler: Helper.defaultHandler,
            plugins: {
              '@msimerson/hapi-openapi': {
                order: 2
              }
            }
          }
        },
        {
          method: 'DELETE',
          path: '/a',
          options: {
            tags: ['api'],
            handler: Helper.defaultHandler,
            plugins: {
              '@msimerson/hapi-openapi': {
                order: 3
              }
            }
          }
        },
        {
          method: 'POST',
          path: '/a',
          options: {
            tags: ['api'],
            handler: Helper.defaultHandler,
            plugins: {
              '@msimerson/hapi-openapi': {
                order: 7
              }
            }
          }
        },
        {
          method: 'GET',
          path: '/a',
          options: {
            tags: ['api'],
            handler: Helper.defaultHandler,
            plugins: {
              '@msimerson/hapi-openapi': {
                order: 6
              }
            }
          }
        }
      ];

      /* These test are no longer needed `sortPaths` is to be deprecate

        it('sort ordered unsorted', (done) => {

            Helper.createServer({ sortPaths: 'unsorted' }, routes, (err, server) => {
                server.inject({ method: 'GET', url: '/swagger.json' }, function (response) {

                    //console.log(JSON.stringify(response.result.paths['/a']));
                    assert.deepStrictEqual(Object.keys(response.result.paths['/a']), ['post', 'get', 'delete']);
                    done();
                });
            });
        });
         */

      it('sort ordered path-method', async () => {
        const server = await Helper.createServer({ OAS: version, sortPaths: 'path-method' }, routes);
        const response = await server.inject({
          method: 'GET',
          url: version === 'v2' ? '/swagger.json' : '/openapi.json'
        });
        assert.deepStrictEqual(Object.keys(response.result.paths['/a']), ['delete', 'get', 'post']);
        const isValid = await Validate.test(response.result);
        assert.strictEqual(isValid, true);
      });
    });
  });
});
