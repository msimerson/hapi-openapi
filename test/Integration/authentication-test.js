const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');
const Validate = require('../../lib/validate.js');

describe('default `auth` settings', () => {
  const routes = [
    {
      method: 'GET',
      path: '/',
      options: {
        auth: false,
        handler: () => {
          return { text: 'Token not required' };
        }
      }
    },
    {
      method: 'GET',
      path: '/restricted',
      options: {
        auth: 'jwt',
        tags: ['api'],
        plugins: {
          '@msimerson/hapi-openapi': {
            security: [{ jwt: [] }]
          }
        },
        handler: function (request, h) {
          h.response({ text: `You used a Token! ${request.auth.credentials.name}` }).header(
            'Authorization',
            request.headers.authorization
          );
        }
      }
    }
  ];

  it('get documentation page should not be restricted', async () => {
    const requestOptions = {
      method: 'GET',
      url: '/documentation'
    };

    const server = await Helper.createJWTAuthServer({}, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('get documentation page should be restricted 401', async () => {
    const requestOptions = {
      method: 'GET',
      url: '/documentation'
    };

    const server = await Helper.createJWTAuthServer({ auth: undefined }, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.statusCode, 401);
  });
});

describe('authentication', () => {
  // route using bearer token auth
  const routes = {
    method: 'POST',
    path: '/bookmarks/',
    options: {
      handler: Helper.defaultAuthHandler,
      plugins: {
        '@msimerson/hapi-openapi': {
          payloadType: 'form'
        }
      },
      tags: ['api'],
      auth: {
        strategy: 'bearer',
        access: {
          scope: ['admin', 'manager']
        }
      },
      validate: {
        headers: Joi.object({
          authorization: Joi.string().default('Bearer 12345').description('bearer token')
        }).unknown(),

        payload: Joi.object({
          url: Joi.string().required().description('the url to bookmark')
        })
      }
    }
  };

  it('get plug-in interface with bearer token', async () => {
    const requestOptions = {
      method: 'GET',
      url: '/swagger.json',
      headers: {
        authorization: `Bearer ${Helper.validBearerToken}`
      }
    };

    const server = await Helper.createAuthServer({}, routes);
    const response = await server.inject(requestOptions);

    assert.deepStrictEqual(response.statusCode, 200);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('get plug-in interface without bearer token', async () => {
    const requestOptions = {
      method: 'GET',
      url: '/swagger.json'
    };

    // plugin routes should be not be affected by auth on API
    const server = await Helper.createAuthServer({}, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.statusCode, 200);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('get formatted scopes when authAccessFormatter option is present', async () => {
    const requestOptions = {
      method: 'GET',
      url: '/swagger.json'
    };

    // plugin routes should be not be affected by auth on API
    const server = await Helper.createAuthServer(
      {
        authAccessFormatter(accesses) {
          if (accesses?.length) {
            return `Scopes:\n- ${accesses.map((access) => access.scope.selection.join('\n- '))}`;
          }
        }
      },
      routes
    );
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(
      response.result.paths['/bookmarks/'].post.description,
      `Scopes:
- admin
- manager`
    );
  });

  it('get API interface with bearer token', async () => {
    const requestOptions = {
      method: 'POST',
      url: '/bookmarks/',
      headers: {
        authorization: `Bearer ${Helper.validBearerToken}`
      },
      payload: {
        url: 'http://glennjones.net'
      }
    };

    const server = await Helper.createAuthServer({}, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.statusCode, 200);
  });

  it('get API interface with incorrect bearer token', async () => {
    const requestOptions = {
      method: 'POST',
      url: '/bookmarks/',
      headers: {
        authorization: 'Bearer XXXXXX'
      },
      payload: {
        url: 'http://glennjones.net'
      }
    };

    const server = await Helper.createAuthServer({}, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.statusCode, 401);
  });
});
