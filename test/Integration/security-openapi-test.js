const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

describe('security (OpenAPI)', () => {
  // example from https://petstore3.swagger.io/api/v3/openapi.json
  const swaggerOptions = {
    OAS: 'v3.0',
    securityDefinitions: {
      petstore_auth: {
        type: 'oauth2',
        flows: {
          implicit: {
            authorizationUrl: 'https://petstore3.swagger.io/oauth/authorize',
            scopes: {
              'write:pets': 'modify pets in your account',
              'read:pets': 'read your pets'
            }
          }
        }
      },
      api_key: {
        type: 'apiKey',
        name: 'api_key',
        in: 'header',
        'x-keyPrefix': 'Bearer '
      }
    },
    security: [{ api_key: [] }]
  };

  // route with examples of security objects from https://petstore3.swagger.io/api/v3/openapi.json
  const routes = [
    {
      method: 'POST',
      path: '/bookmarks/1/',
      options: {
        handler: Helper.defaultHandler,
        plugins: {
          '@msimerson/hapi-openapi': {
            payloadType: 'form',
            security: [{ api_key: [] }]
          }
        },
        tags: ['api'],
        validate: {
          payload: Joi.object({
            url: Joi.string().required().description('the url to bookmark')
          })
        }
      }
    },
    {
      method: 'POST',
      path: '/bookmarks/2/',
      options: {
        handler: Helper.defaultHandler,
        plugins: {
          '@msimerson/hapi-openapi': {
            payloadType: 'form',
            security: [
              {
                petstore_auth: ['write:pets', 'read:pets']
              }
            ]
          }
        },
        tags: ['api'],
        validate: {
          payload: Joi.object({
            url: Joi.string().required().description('the url to bookmark')
          })
        }
      }
    }
  ];

  it('passes through securityDefinitions', async () => {
    const requestOptions = {
      method: 'GET',
      url: '/openapi.json',
      headers: {
        authorization: 'Bearer 12345'
      }
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.components.securitySchemes, swaggerOptions.securityDefinitions);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('passes through security objects for whole api', async () => {
    const requestOptions = {
      method: 'GET',
      url: '/openapi.json'
    };

    // plugin routes should be not be affected by auth on API
    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.security, swaggerOptions.security);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('passes through security objects on routes', async () => {
    const requestOptions = {
      method: 'GET',
      url: '/openapi.json'
    };

    // plugin routes should be not be affected by auth on API
    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject(requestOptions);
    assert.deepStrictEqual(response.result.paths['/bookmarks/1/'].post.security, [
      {
        api_key: []
      }
    ]);
    assert.deepStrictEqual(response.result.paths['/bookmarks/2/'].post.security, [
      {
        petstore_auth: ['write:pets', 'read:pets']
      }
    ]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  // it('passes through x-keyPrefix', async() => {

  //     const prefixBearerOptions = {
  //         debug: true,
  //         securityDefinitions: {
  //             'Bearer': {
  //                 'type': 'apiKey',
  //                 'name': 'Authorization',
  //                 'in': 'header',
  //                 'x-keyPrefix': 'Bearer '
  //             }
  //         },
  //         security: [{ 'Bearer': [] }]
  //     };

  //     const requestOptions = {
  //         method: 'GET',
  //         url: '/documentation/debug'
  //     };

  //     // plugin routes should be not be affected by auth on API
  //     const server = await Helper.createServer(prefixBearerOptions, routes);
  //     const response = await server.inject(requestOptions);
  //     assert.deepStrictEqual(JSON.parse(response.result).keyPrefix, 'Bearer ');
  // });

  // it('no keyPrefix', async() => {

  //     const prefixOauth2Options = {
  //         debug: true,
  //         securityDefinitions: {
  //             'Oauth2': {
  //                 'type': 'oauth2',
  //                 'authorizationUrl': 'http://petstore.swagger.io/api/oauth/dialog',
  //                 'flow': 'implicit',
  //                 'scopes': {
  //                     'write:pets': 'modify pets in your account',
  //                     'read:pets': 'read your pets'
  //                 }
  //             }
  //         },
  //         security: [{ 'Oauth2': [] }]
  //     };

  //     const requestOptions = {
  //         method: 'GET',
  //         url: '/documentation/debug'
  //     };

  //     // plugin routes should be not be affected by auth on API
  //     const server = await Helper.createServer(prefixOauth2Options, routes);
  //     const response = await server.inject(requestOptions);
  //     assert.deepStrictEqual(JSON.parse(response.result).keyPrefix, undefined);

  // });
});
