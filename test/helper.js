const Basic = require('@hapi/basic');
const H2o2 = require('@hapi/h2o2');
const Hapi = require('@hapi/hapi');
const { json: streamJson } = require('node:stream/consumers');
const HapiOpenapi = require('../lib/index.js');

const BASIC_USERNAME = 'admin';
const BASIC_PASSWORD = 'secret';
const BASIC_CREDENTIALS = {
  id: 1,
  scope: ['admin'],
  user: { username: 'glennjones', name: 'Glenn Jones', groups: ['admin', 'user'] }
};

const validateBasic = (_request, username, password) => {
  const isValid = username === BASIC_USERNAME && password === BASIC_PASSWORD;
  return { isValid, credentials: isValid ? BASIC_CREDENTIALS : {} };
};

const helper = (module.exports = {});

helper.validAuthHeader = 'Basic ' + Buffer.from(`${BASIC_USERNAME}:${BASIC_PASSWORD}`).toString('base64');

const activeServers = new Set();

const track = (server) => {
  activeServers.add(server);
  return server;
};

helper.cleanup = async () => {
  const servers = [...activeServers];
  activeServers.clear();
  await Promise.all(servers.map((s) => s.stop().catch(() => {})));
};

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

  await server.initialize();
  return track(server);
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

  await server.initialize();
  return track(server);
};

/**
 * creates a Hapi server using basic auth, strategy named 'bearer'
 *
 * @param  {Object} swaggerOptions
 * @param  {Object} routes
 */
helper.createAuthServer = async (swaggerOptions, routes, serverOptions = {}) => {
  const server = new Hapi.Server(serverOptions);

  await server.register([
    H2o2,
    Basic,
    {
      plugin: HapiOpenapi,
      options: swaggerOptions
    }
  ]);

  server.auth.strategy('bearer', 'basic', { validate: validateBasic });
  server.route(routes);

  await server.initialize();

  return track(server);
};

/**
 * creates a Hapi server using basic auth as default, strategy named 'jwt'
 *
 * @param  {Object} swaggerOptions
 * @param  {Object} routes
 */
helper.createJWTAuthServer = async (swaggerOptions, routes) => {
  const server = new Hapi.Server();

  await server.register([
    Basic,
    {
      plugin: HapiOpenapi,
      options: swaggerOptions
    }
  ]);

  server.auth.strategy('jwt', 'basic', { validate: validateBasic });
  server.auth.default('jwt');

  server.route(routes);
  await server.initialize();
  return track(server);
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
