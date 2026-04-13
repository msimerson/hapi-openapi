'use strict';

const Hapi = require('@hapi/hapi');

const HapiOpenapi = require('..');

const SwaggerJSONFile = require('./assets/swagger.json');

const swaggerOptions = {
  customSwaggerFile: SwaggerJSONFile
};

const ser = async () => {
  const server = Hapi.Server({
    host: 'localhost',
    port: 3000
  });

  await server.register([
    {
      plugin: HapiOpenapi,
      options: swaggerOptions
    }
  ]);

  await server.start();
  return server;
};

ser()
  .then((server) => {
    console.log(`Server listening on ${server.info.uri}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
