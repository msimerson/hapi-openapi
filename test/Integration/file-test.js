const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Validate = require('../../lib/validate.js');

describe('file', () => {
  const routes = {
    method: 'POST',
    path: '/test/',
    options: {
      handler: Helper.defaultHandler,
      plugins: {
        '@msimerson/hapi-openapi': {
          payloadType: 'form'
        }
      },
      tags: ['api'],
      validate: {
        payload: Joi.object({
          file: Joi.any().meta({ swaggerType: 'file' }).required()
        })
      },
      payload: {
        maxBytes: 1048576,
        parse: true,
        output: 'stream'
      }
    }
  };

  it('upload', async () => {
    const server = await Helper.createServer({}, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test/'].post.parameters, [
      {
        type: 'file',
        required: true,
        'x-meta': {
          swaggerType: 'file'
        },
        name: 'file',
        in: 'formData'
      }
    ]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('upload (OAS3)', async () => {
    const server = await Helper.createServer({ OAS: 'v3.0' }, routes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.statusCode, 200);

    assert.deepStrictEqual(response.result.paths['/test/'].post.requestBody.content, {
      'multipart/form-data': {
        schema: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              format: 'binary',
              'x-meta': {
                swaggerType: 'file'
              }
            }
          },
          required: ['file']
        }
      }
    });
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('upload with binary file type', async () => {
    routes.options.validate.payload = Joi.object({
      file: Joi.binary().meta({ swaggerType: 'file' }).required()
    });

    const server = await Helper.createServer({}, routes);

    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test/'].post.parameters, [
      {
        type: 'file',
        format: 'binary',
        required: true,
        'x-meta': {
          swaggerType: 'file'
        },
        name: 'file',
        in: 'formData'
      }
    ]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('file type not fired on other meta properties', async () => {
    routes.options.validate.payload = Joi.object({
      file: Joi.any().meta({ anything: 'test' }).required()
    });

    const server = await Helper.createServer({}, routes);

    const response = await server.inject({ method: 'GET', url: '/swagger.json' });

    assert.deepStrictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.result.paths['/test/'].post.parameters, [
      {
        required: true,
        'x-meta': {
          anything: 'test'
        },
        in: 'formData',
        name: 'file',
        type: 'string'
      }
    ]);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });
});
