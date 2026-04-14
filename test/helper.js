const H2o2 = require('@hapi/h2o2');
const Hapi = require('@hapi/hapi');
const JWT = require('jsonwebtoken');
const { json: streamJson } = require('node:stream/consumers');
const HapiOpenapi = require('../lib/index.js');

const BEARER_SECRET = 'bearer-test-secret';
const BEARER_PAYLOAD = { id: 1, scope: ['admin'] };

const helper = (module.exports = {});

helper.validBearerToken = JWT.sign(BEARER_PAYLOAD, BEARER_SECRET);

/**
 * creates a Hapi server
 *
 * @param  {Object} swaggerOptions
 * @param  {Object} routes
 */
helper.createServer = async (swaggerOptions, routes, serverOptions = {}) => {
  const server = new Hapi.Server(serverOptions);

  await server.register([
    H2o2,
    {
      plugin: HapiOpenapi,
      options: swaggerOptions
    }
  ]);

  if (routes) {
    server.route(routes);
  }

  await server.start();
  return server;
};

/**
 * creates a Hapi server with multiple plugins
 *
 * @param  {Object} swaggerOptions
 * @param  {Object} routes
 * @param  {Function} callback
 */
helper.createServerMultiple = async (swaggerOptions1, swaggerOptions2, routes, serverOptions = {}) => {
  const server = new Hapi.Server(serverOptions);

  await server.register([H2o2]);

  await server.register(
    {
      plugin: HapiOpenapi,
      options: swaggerOptions1
    },
    {
      routes: { prefix: `/${swaggerOptions1.routeTag || 'api1'}` }
    }
  );

  await server.register(
    {
      plugin: HapiOpenapi,
      options: swaggerOptions2
    },
    {
      routes: { prefix: `/${swaggerOptions2.routeTag || 'api2'}` }
    }
  );

  if (routes) {
    server.route(routes);
  }

  await server.start();
  return server;
};

/**
 * creates a Hapi server using bearer token auth
 *
 * @param  {Object} swaggerOptions
 * @param  {Object} routes
 * @param  {Function} callback
 */
helper.createAuthServer = async (swaggerOptions, routes, serverOptions = {}) => {
  const server = new Hapi.Server(serverOptions);

  await server.register([
    H2o2,
    require('hapi-auth-jwt2'),
    {
      plugin: HapiOpenapi,
      options: swaggerOptions
    }
  ]);

  server.auth.strategy('bearer', 'jwt', {
    key: BEARER_SECRET,
    validate: (decoded) => ({
      isValid: decoded.id === BEARER_PAYLOAD.id,
      credentials: {
        ...decoded,
        user: { username: 'glennjones', name: 'Glenn Jones', groups: ['admin', 'user'] }
      }
    }),
    verifyOptions: { algorithms: ['HS256'] }
  });
  server.route(routes);

  await server.start();

  return server;
};

/**
 * creates a Hapi server using JWT auth
 *
 * @param  {Object} swaggerOptions
 * @param  {Object} routes
 * @param  {Function} callback
 */
helper.createJWTAuthServer = async (swaggerOptions, routes) => {
  const people = {
    56732: {
      id: 56732,
      name: 'Jen Jones',
      scope: ['a', 'b']
    }
  };
  const privateKey = 'hapi hapi joi joi';
  // const token = JWT.sign({ id: 56732 }, privateKey, { algorithm: 'HS256' });
  const validateJWT = (decoded) => {
    if (!people[decoded.id]) {
      return { valid: false };
    }

    return { valid: true };
  };

  const server = new Hapi.Server();

  await server.register([
    require('hapi-auth-jwt2'),
    {
      plugin: HapiOpenapi,
      options: swaggerOptions
    }
  ]);

  server.auth.strategy('jwt', 'jwt', {
    key: privateKey,
    validate: validateJWT,
    verifyOptions: { algorithms: ['HS256'] }
  });

  server.auth.default('jwt');

  server.route(routes);
  await server.start();
  return server;
};

/**
 * a handler function used to mock a response
 *
 * @param  {Object} request
 * @param  {Object} reply
 */
helper.defaultHandler = () => {
  return 'ok';
};

/**
 * a handler function used to mock a response to a authorized request
 *
 * @param  {Object} request
 * @param  {Object} reply
 */
helper.defaultAuthHandler = (request, h) => {
  if (request.auth && request.auth.credentials && request.auth.credentials.user) {
    return request.auth.credentials.user;
  }

  return h.response({ message: 'unauthorized' }).code(401);
};

/**
 * fires a Hapi reply with json payload - see h2o2 onResponse function signature
 *
 * @param  {Object} err
 * @param  {Object} res
 * @param  {Object} request
 * @param  {Object} reply
 * @param  {Object} settings
 * @param  {number} ttl
 **/
helper.replyWithJSON = (_, res) => {
  return streamJson(res);
};

/**
 * creates an object with properties which are not its own
 *
 * @return {Object}
 */
helper.objWithNoOwnProperty = () => {
  const sides = { a: 1, b: 2, c: 3 };
  const Triangle = function () {};
  Triangle.prototype = sides;
  return new Triangle();
};

helper.getAssetsPaths = (html) => {
  const linkTag = '<link';
  const scriptTag = '<script src';

  return html
    .split('\n')
    .filter((line) => line.includes(linkTag) || line.includes(scriptTag))
    .map((line) => {
      let firstSplit;

      if (line.includes(linkTag)) {
        [, firstSplit] = line.split('href="');
      } else {
        [, firstSplit] = line.split('src="');
      }

      const [assetPath] = firstSplit.split('"');

      return assetPath;
    });
};
