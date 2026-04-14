# hapi-openapi

This is a [OpenAPI](https://openapis.org/) plug-in for [Hapi](https://hapi.dev/) When installed it will self document the API interface in a project.

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/msimerson/hapi-openapi/ci.yml?style=for-the-badge)
[![npm downloads](https://img.shields.io/npm/dm/hapi-openapi.svg?style=for-the-badge)](https://www.npmjs.com/package/@msimerson/hapi-openapi)
[![MIT license](http://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](https://raw.github.com/msimerson/hapi-openapi/master/license.txt)

## Compatibility

| Version | [@hapi/hapi][hapi] | [Joi][joi] | Node   | Release Notes |
| ------- | ---------------- | ------------ | ------ | ------------- |
| `18`    | `>=21.0.0`      | `>=18.0.0 joi` | >= 22 | [Release][rel18] |
| `17.x`  | `>=20.0.0`      | `>=17.0.0 joi` | `>=16` | [Use old versions][old-repo] |

## Installation

You can add the module to your Hapi using npm:

```bash
> npm install @msimerson/hapi-openapi --save
```

## Documentation

- [Options Reference](optionsreference.md)
- [Usage Guide](usageguide.md)

## Quick start

In your Hapi apps please check the main JavaScript file and add the following code to already created a Hapi `server` object.
You will also add the routes for you API as describe on [hapi website](https://hapi.dev/).

```Javascript
const Hapi = require('@hapi/hapi');
const HapiOpenapi = require('@msimerson/hapi-openapi');
const Pack = require('./package');

(async () => {
    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    const swaggerOptions = {
        info: {
                title: 'Test API Documentation',
                version: Pack.version,
            },
        };

    await server.register([
        {
            plugin: HapiOpenapi,
            options: swaggerOptions
        }
    ]);

    try {
        await server.start();
        console.log('Server running at:', server.info.uri);
    } catch(err) {
        console.log(err);
    }

    server.route(Routes);
})();
```

### Tagging your API routes

As a project may be a mixture of web pages and API endpoints you need to tag the routes you wish Swagger to
document. Simply add the `tags: ['api']` property to the route object for any endpoint you want documenting.

You can even specify more tags and then later generate tag-specific documentation. If you specify
`tags: ['api', 'foo']`, you can later use `/documentation?tags=foo` to load the documentation on the
HTML page (see next section).

```Javascript
{
    method: 'GET',
    path: '/todo/{id}/',
    options: {
        handler: handlers.getToDo,
        description: 'Get todo',
        notes: 'Returns a todo item by the id passed in the path',
        tags: ['api'], // ADD THIS TAG
        validate: {
            params: Joi.object({
                id : Joi.number()
                        .required()
                        .description('the id for the todo item'),
            })
        }
    },
}
```

Once you have tagged your routes start the application. **The plugin adds a page into your site with the route `/documentation`**, so the the full URL for the above options would be `http://localhost:3000/documentation`.

### Typescript

**hapi-openapi** exports its own typescript definition file that can be used when registering the plugin with **Hapi**. See example below:

#### Install Typescript Definition Files

```sh
npm i @types/hapi__hapi @types/hapi__inert @types/hapi__joi @types/node @msimerson/hapi-openapi --save-dev
```

#### Register Plugin with Typescript

```typescript
import * as Hapi from '@hapi/hapi';
import * as HapiOpenapi from '@msimerson/hapi-openapi';

// code omitted for brevity

const swaggerOptions: HapiOpenapi.RegisterOptions = {
    info: {
        title: 'Test API Documentation'
    }
};

const plugins: Array<Hapi.ServerRegisterPluginObject<any>> = [
    {
        plugin: HapiOpenapi,
        options: swaggerOptions
    }
];

await server.register(plugins);
```

## Contributing

Read the [contributing guidelines](./.github/CONTRIBUTING.md) for details.

## Credits

**hapi-openapi** was created by [Glenn Jones](https://github.com/glennjones) in 2013. Over the years it was maintained by [Robert McGuinness](https://github.com/robmcguinness) and many community contributors. The upstream repository at [hapi-swagger/hapi-swagger][old-repo] is now archived.

This fork ([msimerson/hapi-openapi][ms-api]) is maintained by [Matt Simerson](https://github.com/msimerson).

[hapi]: https://github.com/hapijs/hapi
[joi]: https://github.com/hapijs/joi
[ms-api]: https://github.com/msimerson/hapi-openapi
[old-repo]: https://github.com/hapi-swagger/hapi-swagger
[rel18]: https://github.com/msimerson/hapi-openapi/releases/tag/v18.0.0