const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');
const Validate = require('../../lib/validate.js');

describe('path', () => {
  const requiredChildSchema = Joi.object({
    p1: Joi.string()
  }).required();

  const responseBodySchema = Joi.object({
    requiredChild: requiredChildSchema
  }).label('Response');

  const requestBodySchema = Joi.object({
    requiredChild: requiredChildSchema,
    optionalChild: requiredChildSchema.optional()
  }).label('Request');

  const routes = {
    method: 'POST',
    path: '/test',
    handler: Helper.defaultHandler,
    options: {
      description: 'Required should appear on response and request',
      notes: ['Testing'],
      tags: ['api'],
      validate: {
        payload: requestBodySchema
      },
      response: {
        schema: responseBodySchema
      }
    }
  };

  it('parent required should include required children', async () => {
    // we need to set reuseDefinitions to false here otherwise,
    // Request would be reused for Response as they're too similar
    const server = await Helper.createServer({ reuseDefinitions: false }, routes);
    const response = await server.inject({ method: 'GET', url: '/swagger.json' });
    assert.deepStrictEqual(response.result.definitions.Request.required, ['requiredChild']);
    assert.deepStrictEqual(response.result.definitions.Response.required, ['requiredChild']);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });

  it('parent required should include required children (OpenAPI)', async () => {
    // we need to set reuseDefinitions to false here otherwise,
    // Request would be reused for Response as they're too similar
    const server = await Helper.createServer({ OAS: 'v3.0', reuseDefinitions: false }, routes);
    const response = await server.inject({ method: 'GET', url: '/openapi.json' });
    assert.deepStrictEqual(response.result.components.schemas.Request.required, ['requiredChild']);
    assert.deepStrictEqual(response.result.components.schemas.Response.required, ['requiredChild']);
    const isValid = await Validate.test(response.result);
    assert.strictEqual(isValid, true);
  });
});
