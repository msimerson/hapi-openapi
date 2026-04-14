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

const Hapi = require('@hapi/hapi');
const Hoek = require('@hapi/hoek');
const Inert = require('@hapi/inert');
const Joi = require('joi');
const Pack = require('../../package.json');
const HapiOpenapi = require('../../lib/index.js');
const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

describe('plugin', () => {
  const routes = [
    {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['api'],
        validate: {
          payload: Joi.object({
            a: Joi.number(),
            b: Joi.number(),
            operator: Joi.string(),
            equals: Joi.number()
          })
        }
      }
    }
  ];

  it('plug-in register no inert dependency', async () => {
    try {
      const server = new Hapi.Server();
      await server.register([HapiOpenapi]);
      server.route(routes);
      await server.initialize();
    } catch (err) {
      assert.deepStrictEqual(err.message, `Plugin ${Pack.name} missing dependency @hapi/inert`);
    }
  });

  it('plug-in register no options', async () => {
    try {
      const server = new Hapi.Server();
      await server.register([Inert, HapiOpenapi]);
      server.route(routes);
      await server.initialize();
      assert.ok(server !== null && typeof server === 'object' && !Array.isArray(server));
    } catch (err) {
      assert.deepStrictEqual(err, undefined);
    }
  });

  it('fail plug-in register with bad options', async () => {
    const badOptions = {
      validate: 42
    };
    try {
      await Helper.createServer(badOptions, routes);
    } catch (err) {
      assert.ok(err != null);
      assert.deepStrictEqual(err.name, 'ValidationError');
      assert.strictEqual(err.details.length ?? Object.keys(err.details).length, 1);
      assert.deepStrictEqual(err.details[0].message, '"validate" must be of type object');
    }
  });

  it('plug-in register test', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.strictEqual(response.result.paths.length ?? Object.keys(response.result.paths).length, 1);
  });

  it('plug-in register with validate option', async () => {
    const pluginOptions = {
      validate: {
        headers: true
      }
    };
    const server = await Helper.createServer(pluginOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.strictEqual(response.result.paths.length ?? Object.keys(response.result.paths).length, 1);
  });

  it('plug-in register with server validation options', async () => {
    const serverOptions = {
      routes: {
        validate: {
          failAction: (request, h, err) => {
            Hoek.ignore(request, h);
            throw err;
          },
          headers: Joi.object({
            authorization: Joi.string().required()
          }).required()
        }
      }
    };
    const server = await Helper.createServer(undefined, routes, serverOptions);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 400);
    assert.deepStrictEqual(response.statusMessage, 'Bad Request');
    assert.deepStrictEqual(response.result.statusCode, 400);
    assert.deepStrictEqual(response.result.error, 'Bad Request');
    assert.deepStrictEqual(response.result.message, '"authorization" is required');
  });

  it('plug-in register and overrride server validation options', async () => {
    const serverOptions = {
      routes: {
        validate: {
          failAction: (request, h, err) => {
            Hoek.ignore(request, h);
            throw err;
          },
          headers: Joi.object({
            authorization: Joi.string().required()
          }).required()
        }
      }
    };
    const pluginOptions = {
      validate: {
        headers: true
      }
    };
    const server = await Helper.createServer(pluginOptions, routes, serverOptions);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.strictEqual(response.result.paths.length ?? Object.keys(response.result.paths).length, 1);
  });

  it('default jsonPath url', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('default documentationPath url', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/documentation' });
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('default swaggerUIPath url', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swaggerui/swagger-ui.js' });
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('swaggerUIPath + extend.js remapping', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swaggerui/extend.js' });
    assert.deepStrictEqual(response.statusCode, 200);
  });

  const swaggerOptions = {
    jsonPath: '/test.json',
    documentationPath: '/testdoc',
    swaggerUIPath: '/testui/'
  };

  it('repathed jsonPath url', async () => {
    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/test.json' });
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('repathed jsonPath url and jsonRoutePath', async () => {
    const jsonRoutePath = '/testRoute/test.json';

    const server = await Helper.createServer(
      {
        ...swaggerOptions,
        jsonRoutePath
      },
      routes
    );

    const notFoundResponse = await server.inject({ method: 'GET', url: '/test.json' });

    assert.deepStrictEqual(notFoundResponse.statusCode, 404);

    const okResponse = await server.inject({ method: 'GET', url: jsonRoutePath });

    assert.deepStrictEqual(okResponse.statusCode, 200);
  });

  it('repathed documentationPath url', async () => {
    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/testdoc' });
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('repathed assets url', async () => {
    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/testdoc' });

    assert.deepStrictEqual(response.statusCode, 200);

    const assets = Helper.getAssetsPaths(response.result);

    assets.forEach((asset) => {
      assert.ok(__includes(asset, swaggerOptions.swaggerUIPath));
    });

    const responses = await Promise.all(
      assets.map((asset) => {
        return server.inject({ method: 'GET', url: asset });
      })
    );

    responses.forEach((assetResponse) => {
      assert.deepStrictEqual(assetResponse.statusCode, 200);
    });
  });

  it('repathed assets url and reoutes path', async () => {
    const routesBasePath = '/testRoute/';
    const server = await Helper.createServer(
      {
        ...swaggerOptions,
        routesBasePath
      },
      routes
    );
    const response = await server.inject({ method: 'GET', url: '/testdoc' });

    assert.deepStrictEqual(response.statusCode, 200);

    const assets = Helper.getAssetsPaths(response.result);

    assets.forEach((asset) => {
      assert.ok(__includes(asset, swaggerOptions.swaggerUIPath));
    });

    const notFoundResponses = await Promise.all(
      assets.map((asset) => {
        return server.inject({ method: 'GET', url: asset });
      })
    );

    notFoundResponses.forEach((assetResponse) => {
      assert.deepStrictEqual(assetResponse.statusCode, 404);
    });

    const okResponses = await Promise.all(
      assets.map((asset) => {
        return server.inject({ method: 'GET', url: asset.replace(swaggerOptions.swaggerUIPath, routesBasePath) });
      })
    );

    okResponses.forEach((assetResponse) => {
      assert.deepStrictEqual(assetResponse.statusCode, 200);
    });
  });

  it('disable documentation path', async () => {
    const swaggerOptions = {
      documentationPage: false
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/documentation' });
    assert.deepStrictEqual(response.statusCode, 404);
  });

  it('disable swagger UI', async () => {
    const swaggerOptions = {
      swaggerUI: false,
      documentationPage: false
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swaggerui/swagger-ui.js' });
    assert.deepStrictEqual(response.statusCode, 404);
  });

  it('disable swagger UI overridden by documentationPage', async () => {
    const swaggerOptions = {
      swaggerUI: false,
      documentationPage: true
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swaggerui/swagger-ui.js' });
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('should take the plugin route prefix into account when rendering the UI', async () => {
    const server = new Hapi.Server();
    await server.register([
      Inert,
      {
        plugin: HapiOpenapi,
        routes: {
          prefix: '/implicitPrefix'
        },
        options: {}
      }
    ]);

    server.route(routes);
    await server.initialize();
    const response = await server.inject({ method: 'GET', url: '/implicitPrefix/documentation' });
    assert.deepStrictEqual(response.statusCode, 200);
    const htmlContent = response.result;
    assert.ok(
      __includes(htmlContent, ['/implicitPrefix/swaggerui/swagger-ui-bundle.js', '/implicitPrefix/swagger.json'])
    );
  });

  it('enable cors settings, should return headers with origin settings', async () => {
    const swaggerOptions = {
      cors: true
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    // https://stackoverflow.com/questions/25329405/why-isnt-vary-origin-response-set-on-a-cors-miss
    assert.deepStrictEqual(response.headers.vary, 'origin');
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters.length, 1);
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters[0].name, 'body');
  });

  it('disable cors settings, should return headers without origin settings', async () => {
    const swaggerOptions = {
      cors: false
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.notDeepStrictEqual(response.headers.vary, 'origin');
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters.length, 1);
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters[0].name, 'body');
  });

  it('default cors settings as false, should return headers without origin settings', async () => {
    const swaggerOptions = {};

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.notDeepStrictEqual(response.headers.vary, 'origin,accept-encoding');
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters.length, 1);
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters[0].name, 'body');
  });

  it('payloadType = form global', async () => {
    const swaggerOptions = {
      payloadType: 'json'
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters.length, 1);
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters[0].name, 'body');
  });

  it('payloadType = json global', async () => {
    const swaggerOptions = {
      payloadType: 'form'
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters.length, 4);
    assert.deepStrictEqual(response.result.paths['/store/'].post.parameters[0].name, 'a');
  });

  it('pathPrefixSize global', async () => {
    const swaggerOptions = {
      pathPrefixSize: 2
    };

    const prefixRoutes = [
      {
        method: 'GET',
        path: '/foo/bar/extra',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api']
        }
      }
    ];

    const server = await Helper.createServer(swaggerOptions, prefixRoutes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/foo/bar/extra'].get.tags[0], 'foo/bar');
  });

  it('expanded none', async () => {
    // TODO find a way to test impact of property change
    const server = await Helper.createServer({ expanded: 'none' });
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('expanded list', async () => {
    const server = await Helper.createServer({ expanded: 'list' });
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('expanded full', async () => {
    const server = await Helper.createServer({ expanded: 'full' }, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('pass through of tags querystring', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/documentation?tags=reduced' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.indexOf('swagger.json?tags=reduced') > -1, true);
  });

  it('reset to defaults after removing tags querystring', async () => {
    const server = await Helper.createServer({}, routes);

    const response1 = await server.inject({ method: 'GET', url: '/documentation?tags=foo' });
    assert.deepStrictEqual(response1.statusCode, 200);
    assert.ok(__includes(response1.result, '"/swagger.json?tags=foo"'));

    const response2 = await server.inject({ method: 'GET', url: '/documentation' });
    assert.deepStrictEqual(response2.statusCode, 200);
    assert.ok(!__includes(response2.result, '"/swagger.json?tags=foo"'));
    assert.ok(__includes(response2.result, '"/swagger.json"'));
  });

  it('tryItOutEnabled true', async () => {
    const server = await Helper.createServer({ tryItOutEnabled: true });
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('tryItOutEnabled false', async () => {
    const server = await Helper.createServer({ tryItOutEnabled: false });
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('test route x-meta appears in swagger', async () => {
    const testRoutes = [
      {
        method: 'POST',
        path: '/test/',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api'],
          plugins: {
            '@msimerson/hapi-openapi': {
              'x-meta': {
                test1: true,
                test2: 'test',
                test3: {
                  test: true
                }
              }
            }
          }
        }
      }
    ];
    const server = await Helper.createServer({}, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.result.paths['/test/'].post['x-meta'], {
      test1: true,
      test2: 'test',
      test3: {
        test: true
      }
    });
  });

  it('test arbitrary vendor extensions (x-*) appears in swagger', async () => {
    const testRoutes = [
      {
        method: 'POST',
        path: '/test/',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api'],
          plugins: {
            '@msimerson/hapi-openapi': {
              'x-code-samples': {
                lang: 'JavaScript',
                source: 'console.log("Hello World");'
              },
              'x-custom-string': 'some string'
            }
          }
        }
      }
    ];
    const server = await Helper.createServer({}, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.result.paths['/test/'].post['x-code-samples'], {
      lang: 'JavaScript',
      source: 'console.log("Hello World");'
    });
    assert.deepStrictEqual(response.result.paths['/test/'].post['x-custom-string'], 'some string');
  });

  it('test {disableDropdown: true} in swagger', async () => {
    const testRoutes = [
      {
        method: 'POST',
        path: '/test/',
        options: {
          handler: Helper.defaultHandler,
          tags: ['api'],
          validate: {
            payload: Joi.object({
              a: Joi.number().integer().allow(0).meta({ disableDropdown: true })
            })
          }
        }
      }
    ];
    const server = await Helper.createServer({}, testRoutes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.result.definitions, {
      Model1: {
        type: 'object',
        properties: {
          a: {
            type: 'integer',
            'x-meta': {
              disableDropdown: true
            }
          }
        }
      }
    });
  });
});

describe('multiple plugins', () => {
  const routes = [
    {
      method: 'POST',
      path: '/store/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['store-api'],
        validate: {
          payload: Joi.object({
            a: Joi.number(),
            b: Joi.number(),
            operator: Joi.string(),
            equals: Joi.number()
          })
        }
      }
    },
    {
      method: 'POST',
      path: '/shop/',
      options: {
        handler: Helper.defaultHandler,
        tags: ['shop-api'],
        validate: {
          payload: Joi.object({
            c: Joi.number(),
            d: Joi.number(),
            operator: Joi.string(),
            equals: Joi.number()
          })
        }
      }
    }
  ];

  it('multiple plugins can co-exist', async () => {
    const swaggerOptions1 = {
      routeTag: 'store-api',
      info: {
        description: 'This is the store API docs'
      }
    };
    const swaggerOptions2 = {
      routeTag: 'shop-api',
      info: {
        description: 'This is the shop API docs'
      }
    };
    const server = await Helper.createServerMultiple(swaggerOptions1, swaggerOptions2, routes);

    const response1 = await server.inject({ method: 'GET', url: '/store-api/swagger.json' });
    assert.deepStrictEqual(response1.statusCode, 200);
    const isValid1 = await Validate.test(response1.result);
    assert.strictEqual(isValid1, true);
    assert.deepStrictEqual(response1.result.info.description, 'This is the store API docs');
    assert.deepStrictEqual(response1.result.paths['/store/'].post.operationId, 'postStore');

    const response2 = await server.inject({ method: 'GET', url: '/shop-api/swagger.json' });
    assert.deepStrictEqual(response2.statusCode, 200);
    const isValid2 = await Validate.test(response2.result);
    assert.strictEqual(isValid2, true);
    assert.deepStrictEqual(response2.result.info.description, 'This is the shop API docs');
    assert.deepStrictEqual(response2.result.paths['/shop/'].post.operationId, 'postShop');

    const document1 = await server.inject({ method: 'GET', url: '/store-api/documentation' });
    assert.deepStrictEqual(document1.statusCode, 200);
    assert.ok(__includes(document1.result, '/store-api/'));
    assert.ok(!__includes(document1.result, '/shop-api/'));

    const document2 = await server.inject({ method: 'GET', url: '/shop-api/documentation' });
    assert.deepStrictEqual(document2.statusCode, 200);
    assert.ok(__includes(document2.result, '/shop-api/'));
    assert.ok(!__includes(document2.result, '/store-api/'));
  });

  it('start server with custom Swagger json file', async () => {
    const swaggerOptions = {
      customSwaggerFile: require('../../examples/assets/swagger.json')
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/live'].get.parameters, undefined);
    assert.deepStrictEqual(response.result.paths['/live'].get.responses[200].description, 'Successful');
  });
});
