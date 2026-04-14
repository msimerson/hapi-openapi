const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const Helper = require('../helper.js');

after(() => Helper.cleanup());

describe('XSS protection', () => {
  const routes = [
    {
      method: 'GET',
      path: '/test',
      options: {
        tags: ['api'],
        handler: Helper.defaultHandler
      }
    }
  ];

  it('escapes info.title', async () => {
    const maliciousTitle = '</title><script>alert("XSS-TITLE")</script>';
    const swaggerOptions = {
      info: {
        title: maliciousTitle,
        version: '1.0.0'
      },
      documentationPage: true,
      swaggerUI: true
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({
      method: 'GET',
      url: '/documentation'
    });

    assert.strictEqual(response.statusCode, 200);
    assert.ok(!response.payload.includes(maliciousTitle), 'Should not contain raw malicious title');
    assert.ok(response.payload.includes('&lt;/title&gt;'), 'Should contain escaped title');
  });

  it('escapes swaggerUIPath', async () => {
    const maliciousUIPath = '/swaggerui/"><script>alert("XSS-UIPATH")</script>';
    const swaggerOptions = {
      routesBasePath: '/swaggerui/', // Valid path for Hapi
      swaggerUIPath: maliciousUIPath, // Malicious path for HTML injection
      documentationPage: true,
      swaggerUI: true
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({
      method: 'GET',
      url: '/documentation'
    });

    assert.strictEqual(response.statusCode, 200);
    assert.ok(!response.payload.includes(maliciousUIPath), 'Should not contain raw malicious UIPath');
    assert.ok(response.payload.includes('href="/swaggerui/&quot;&gt;&lt;script&gt;'), 'Should contain escaped UIPath in href');
  });

  it('sanitizes JSON configuration against script termination', async () => {
    const maliciousOption = '</script><script>alert(\'XSS-JSON-INJECTION\')</script>';
    const swaggerOptions = {
      uiOptions: {
        foo: maliciousOption
      },
      documentationPage: true,
      swaggerUI: true
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({
      method: 'GET',
      url: '/documentation'
    });

    assert.strictEqual(response.statusCode, 200);
    assert.ok(!response.payload.includes(maliciousOption), 'Should not contain raw malicious JSON option');
    assert.ok(response.payload.includes('\\u003c/script>'), 'Should contain escaped script tag in JSON');
  });

  it('serves security headers on documentation page', async () => {
    const swaggerOptions = {
      documentationPage: true
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({
      method: 'GET',
      url: '/documentation'
    });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(response.headers['x-frame-options'], 'DENY');
    assert.strictEqual(response.headers['x-xss-protection'], '1; mode=block');
  });

  it('rejects uiCompleteScript as a raw JS string', async () => {
    const swaggerOptions = {
      uiCompleteScript: 'alert("xss")',
      documentationPage: true,
      swaggerUI: true
    };

    await assert.rejects(() => Helper.createServer(swaggerOptions, routes), 'Should reject raw JS string for uiCompleteScript');
  });

  it('loads uiCompleteScript src via script element, not new Function', async () => {
    const maliciousSrc = '\'); alert(\'XSS-UICOMPLETESCRIPT\'); (';
    const swaggerOptions = {
      uiCompleteScript: {
        src: maliciousSrc
      },
      documentationPage: true,
      swaggerUI: true
    };

    const server = await Helper.createServer(swaggerOptions, routes);
    const response = await server.inject({
      method: 'GET',
      url: '/documentation'
    });

    assert.strictEqual(response.statusCode, 200);
    assert.ok(!response.payload.includes('new Function'), 'Should not use new Function to execute scripts');
    assert.ok(!response.payload.includes('s.src = \''), 'Should not embed src in a JS string literal');
  });
});
