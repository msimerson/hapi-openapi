const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

const versions = ['v2', 'v3.0'];
versions.forEach((version) => {
  const jsonUrl = version === 'v2' ? '/swagger.json' : '/openapi.json';

  describe(`OAS ${version}`, () => {
    describe('tags', () => {
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

      it('no tag objects passed', async () => {
        const server = await Helper.createServer({ OAS: version }, routes);
        const response = await server.inject({ method: 'GET', url: jsonUrl });
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.result.tags, []);
        const isValid = await Validate.test(response.result);
        assert.strictEqual(isValid, true);
      });

      it('name property passed', async () => {
        const swaggerOptions = {
          OAS: version,
          tags: [
            {
              name: 'test'
            }
          ]
        };

        const server = await Helper.createServer(swaggerOptions, routes);
        const response = await server.inject({ method: 'GET', url: jsonUrl });
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.result.tags[0].name, 'test');

        const isValid = await Validate.test(response.result);
        assert.strictEqual(isValid, true);
      });

      it('full tag object', async () => {
        const swaggerOptions = {
          OAS: version,
          tags: [
            {
              name: 'test',
              description: 'Everything about test',
              externalDocs: {
                description: 'Find out more',
                url: 'http://swagger.io'
              }
            }
          ]
        };

        const server = await Helper.createServer(swaggerOptions, routes);
        const response = await server.inject({ method: 'GET', url: jsonUrl });

        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.result.tags, swaggerOptions.tags);
        const isValid = await Validate.test(response.result);
        assert.strictEqual(isValid, true);
      });
    });
  });
});
