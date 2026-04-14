const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const __includes = (container, value) => {
  if (typeof container === 'string') {
    if (Array.isArray(value)) {
      return value.every((v) => container.includes(v));
    }

    return container.includes(value);
  }

  if (Array.isArray(container)) {
    if (Array.isArray(value)) {
      return value.every((v) => container.includes(v));
    }

    return container.includes(value);
  }

  if (container && typeof container === 'object') {
    if (Array.isArray(value)) {
      return value.every((k) => k in container);
    }

    if (typeof value === 'string') {
      return value in container;
    }

    if (value && typeof value === 'object') {
      for (const k of Object.keys(value)) {
        try {
          assert.deepStrictEqual(container[k], value[k]);
        } catch {
          return false;
        }
      }

      return true;
    }
  }

  return false;
};

const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

const versions = ['v2', 'v3.0'];
versions.forEach((version) => {
  const jsonUrl = version === 'v2' ? '/swagger.json' : '/openapi.json';

  describe(`OAS ${version}`, () => {
    describe('wildcard routes', () => {
      it('method *', async () => {
        const routes = {
          method: '*',
          path: '/test',
          handler: Helper.defaultHandler,
          options: {
            tags: ['api'],
            notes: 'test'
          }
        };

        const server = await Helper.createServer({ OAS: version }, routes);
        const response = await server.inject({ method: 'GET', url: jsonUrl });

        assert.deepStrictEqual(response.statusCode, 200);
        assert.strictEqual(
          response.result.paths['/test'].length ?? Object.keys(response.result.paths['/test']).length,
          5
        );
        assert.ok(__includes(response.result.paths['/test'], 'get'));
        assert.ok(__includes(response.result.paths['/test'], 'post'));
        assert.ok(__includes(response.result.paths['/test'], 'put'));
        assert.ok(__includes(response.result.paths['/test'], 'patch'));
        assert.ok(__includes(response.result.paths['/test'], 'delete'));
      });

      it('method * with custom methods', async () => {
        const routes = {
          method: '*',
          path: '/test',
          handler: Helper.defaultHandler,
          options: {
            tags: ['api'],
            notes: 'test'
          }
        };

        const server = await Helper.createServer({ OAS: version, wildcardMethods: ['GET', 'QUERY'] }, routes);
        const response = await server.inject({ method: 'GET', url: jsonUrl });

        assert.deepStrictEqual(response.statusCode, 200);
        assert.strictEqual(
          response.result.paths['/test'].length ?? Object.keys(response.result.paths['/test']).length,
          2
        );
        assert.ok(__includes(response.result.paths['/test'], 'get'));
        assert.ok(__includes(response.result.paths['/test'], 'query'));
      });

      it('method * with not allowed custom methods', async () => {
        try {
          const routes = {
            method: '*',
            path: '/test',
            handler: Helper.defaultHandler,
            options: {
              tags: ['api'],
              notes: 'test'
            }
          };

          await Helper.createServer({ OAS: version, wildcardMethods: ['HEAD', 'OPTIONS'] }, routes);
        } catch (err) {
          assert.ok(err != null);
          assert.ok(__includes(err.message, 'wildcardMethods'));
        }
      });

      it('method array [GET, POST]', async () => {
        const routes = {
          method: ['GET', 'POST'],
          path: '/test',
          handler: Helper.defaultHandler,
          options: {
            tags: ['api'],
            notes: 'test'
          }
        };

        const server = await Helper.createServer({ OAS: version }, routes);
        const response = await server.inject({ method: 'GET', url: jsonUrl });

        assert.deepStrictEqual(response.statusCode, 200);
        assert.strictEqual(
          response.result.paths['/test'].length ?? Object.keys(response.result.paths['/test']).length,
          2
        );
        assert.ok(__includes(response.result.paths['/test'], 'get'));
        assert.ok(__includes(response.result.paths['/test'], 'post'));
        const isValid = await Validate.test(response.result);
        assert.strictEqual(isValid, true);
      });
    });
  });
});
