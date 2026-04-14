const Joi = require('joi');
const { join, sep } = require('path');
const Inert = require('@hapi/inert');

const Pack = require('../package.json');
const Defaults = require('../lib/defaults');
const Builder = require('../lib/builder');
const Utilities = require('../lib/utilities');

// schema for plug-in properties
const schema = Joi.object({
  debug: Joi.boolean(),
  jsonPath: Joi.string(),
  jsonRoutePath: Joi.string(),
  documentationPath: Joi.string(),
  documentationRouteTags: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
  documentationRoutePlugins: Joi.object().default({}),
  swaggerUIPath: Joi.string(),
  routesBasePath: Joi.string(),
  auth: Joi.alternatives().try(Joi.boolean(), Joi.string(), Joi.object()),
  pathPrefixSize: Joi.number().integer().positive(),
  payloadType: Joi.string().valid('form', 'json'),
  documentationPage: Joi.boolean(),
  swaggerUI: Joi.boolean(),
  expanded: Joi.string().valid('none', 'list', 'full'),
  sortTags: Joi.string().valid('alpha', 'unsorted'),
  sortEndpoints: Joi.string().valid('alpha', 'method', 'ordered', 'unsorted'),
  sortPaths: Joi.string().valid('unsorted', 'path-method'),
  authAccessFormatter: Joi.function(),

  // patch: uiCompleteScript -- Define validation scope
  //        use external file by describing it as { src: 'URL' }
  //        you may provide an external js file as URL from a static route,
  //        eg: '/assets/js/doc-patch.js'
  uiCompleteScript: Joi.object().keys({
    src: Joi.string().required()
  }).allow(null),
  uiOptions: Joi.object().default({}),
  xProperties: Joi.boolean(),
  reuseDefinitions: Joi.boolean(),
  wildcardMethods: Joi.array().items(Joi.string().not('HEAD', 'OPTIONS')), // OPTIONS not supported by Swagger and HEAD not support by Hapi
  OAS: Joi.string().valid('v2', 'v3.0'),
  definitionPrefix: Joi.string(),
  deReference: Joi.boolean(),
  validatorUrl: Joi.string().allow(null),
  acceptToProduce: Joi.boolean(),
  cors: Joi.boolean(),
  pathReplacements: Joi.array().items(
    Joi.object({
      replaceIn: Joi.string().valid('groups', 'endpoints', 'all'),
      pattern: Joi.object().instance(RegExp),
      replacement: Joi.string().allow('')
    })
  ),
  routeTag: Joi.alternatives(Joi.string(), Joi.function()),
  // validate as declared in @hapi/hapi
  // https://github.com/hapijs/hapi/blob/5c0850989f2b7270fe7a7b6a7d4ebdc9a7fecd79/lib/config.js#L220
  validate: Joi.object({
    headers: Joi.alternatives(Joi.object(), Joi.array(), Joi.function()).allow(null, true),
    params: Joi.alternatives(Joi.object(), Joi.array(), Joi.function()).allow(null, true),
    query: Joi.alternatives(Joi.object(), Joi.array(), Joi.function()).allow(null, false, true),
    payload: Joi.alternatives(Joi.object(), Joi.array(), Joi.function()).allow(null, false, true),
    state: Joi.alternatives(Joi.object(), Joi.array(), Joi.function()).allow(null, false, true),
    failAction: Joi.alternatives([Joi.valid('error', 'log', 'ignore'), Joi.function()]),
    errorFields: Joi.object(),
    options: Joi.object(),
    validator: Joi.object()
  }),
  tryItOutEnabled: Joi.boolean()
}).unknown();

/**
 * register the plug-in with the Hapi framework
 *
 * @param  {Object} plugin
 * @param  {Object} options
 * @param  {Function} next
 */
exports.plugin = {
  name: Pack.name,
  version: Pack.version,
  multiple: true,

  register: async (server, options) => {
    // `options.validate` might not be present but it should not be set in the
    // `Defaults` since it would always override the server-level defaults.
    // It should be overwritten only if explicitly passed to the plugin options.
    const validateOption = { validate: options.validate };
    const settings = { ...Defaults, ...options };
    const publicDirPath = join(__dirname, '..', 'public');

    // avoid breaking behaviour with previous version
    if (!options.routesBasePath && options.swaggerUIPath) {
      settings.routesBasePath = options.swaggerUIPath;
    }

    if (options.OAS === 'v3.0') {
      settings.jsonPath = options.jsonPath || '/openapi.json';
      settings.jsonRoutePath = options.jsonRoutePath || '/openapi.json';
    }

    if (!options.jsonRoutePath && options.jsonPath) {
      settings.jsonRoutePath = options.jsonPath;
    }

    settings.log = (tags, data) => {
      tags.unshift('hapi-openapi');
      if (settings.debug) {
        server.log(tags, data);
      }
    };

    settings.log(['info'], 'Started');

    // add server method for caching
    if (settings.cache && !server.methods.getSwaggerJSON) {
      // set default
      settings.cache.segment = 'hapi-openapi';
      settings.cache.getDecoratedValue = true;
      if (!settings.cache.generateTimeout) {
        settings.cache.generateTimeout = 30 * 1000;
      }

      const getSwaggerJSON = Builder.getSwaggerJSON;

      // If you need access to the cache result envelope information { value, ttl, report },
      // use the catbox getDecoratedValue option.
      const options = {
        cache: settings.cache,
        generateKey: (settings, request) => `hapi-openapi-${request.path}`
      };
      server.method('getSwaggerJSON', getSwaggerJSON, options);
    }

    Joi.assert(settings, schema);

    // patch: uiCompleteScript -- extract src URL from object form
    if (settings.uiCompleteScript !== null && typeof settings.uiCompleteScript === 'object') {
      settings.uiCompleteScript = settings.uiCompleteScript.src;
    }

    // add routing swagger json
    server.route([
      {
        method: 'GET',
        path: settings.jsonRoutePath,
        options: {
          auth: settings.auth,
          cors: settings.cors,
          tags: settings.documentationRouteTags,
          handler: async (request, h) => {
            if (settings.cache) {
              const { cached, value } = await server.methods.getSwaggerJSON(settings, request);
              const lastModified = cached ? new Date(cached.stored) : new Date();
              return h.response(value).header('last-modified', lastModified.toUTCString());
            }

            const json = await Builder.getSwaggerJSON(settings, request);
            return json;
          },
          plugins: {
            '@msimerson/hapi-openapi': false
          },
          ...validateOption
        }
      }
    ]);

    // only add '@hapi/inert' based routes if needed
    if (settings.documentationPage === true || settings.swaggerUI === true) {
      if (!server.registrations['@hapi/inert']) {
        await server.register(Inert);
      }

      // add documentation page
      if (settings.documentationPage === true) {
        server.route([
          {
            method: 'GET',
            path: settings.documentationPath,
            options: {
              auth: settings.auth,
              tags: settings.documentationRouteTags,
              handler: (request, h) => {
                const pageSettings = buildPageSettings(settings, request, server);
                return h
                  .response(buildDocsPage(pageSettings))
                  .type('text/html')
                  .header('x-content-type-options', 'nosniff')
                  .header('x-frame-options', 'DENY')
                  .header('x-xss-protection', '1; mode=block');
              },
              plugins: settings.documentationRoutePlugins,
              ...validateOption
            }
          }
        ]);
      }

      // add swagger UI if asked for or need by documentation page
      if (settings.documentationPage === true || settings.swaggerUI === true) {
        const swaggerUiAssetPath = require('swagger-ui-dist').getAbsoluteFSPath();

        const filesToServe = [
          'favicon-16x16.png',
          'favicon-32x32.png',
          'index.html',
          'oauth2-redirect.html',
          'swagger-ui-bundle.js',
          'swagger-ui-bundle.js.map',
          'swagger-ui-standalone-preset.js',
          'swagger-ui-standalone-preset.js.map',
          'swagger-ui.css',
          'swagger-ui.css.map',
          'swagger-ui.js',
          'swagger-ui.js.map'
        ];
        filesToServe.forEach((filename) => {
          server.route({
            method: 'GET',
            path: `${settings.routesBasePath}${filename}`,
            options: {
              auth: settings.auth,
              tags: settings.documentationRouteTags,
              files: {
                relativeTo: swaggerUiAssetPath
              },
              ...validateOption
            },
            handler: {
              file: `${filename}`
            }
          });
        });

        server.route({
          method: 'GET',
          path: `${settings.routesBasePath}extend.js`,
          options: {
            tags: settings.documentationRouteTags,
            auth: settings.auth,
            files: {
              relativeTo: publicDirPath
            },
            handler: {
              file: 'extend.js'
            },
            ...validateOption
          }
        });
      }

      // add debug page
      if (settings.debug === true) {
        server.route([
          {
            method: 'GET',
            path: join(settings.documentationPath, sep, 'debug').split(sep).join('/'),
            options: {
              auth: settings.auth,
              tags: settings.documentationRouteTags,
              handler: (request, h) => {
                const pageSettings = buildPageSettings(settings, request, server);
                const json = JSON.stringify(pageSettings).replace(/</g, '\\u003c');
                return h
                  .response(json)
                  .type('application/json')
                  .header('x-content-type-options', 'nosniff')
                  .header('x-frame-options', 'DENY')
                  .header('x-xss-protection', '1; mode=block');
              },
              plugins: settings.documentationRoutePlugins,
              ...validateOption
            }
          }
        ]);
      }
    }

    // TODO: need to work how to test this as it need a request object
    // Undocumented API interface, it may change
    /* c8 ignore start */
    server.expose('getJSON', (exposeOptions, request, callback) => {
      // use either options passed to function or plug-in scope options
      let exposeSettings;
      if (exposeOptions && Utilities.hasProperties(exposeOptions)) {
        exposeSettings = { ...Defaults, ...exposeOptions };
        Joi.assert(exposeSettings, schema);
      } else {
        exposeSettings = { ...settings };
      }

      return Builder.getSwaggerJSON(exposeSettings, request, callback);
    });
    /* c8 ignore stop */
  }
};

/**
 * builds page settings object for the documentation UI
 *
 * @param  {Object} settings
 * @param  {Object} request
 * @param  {Object} server
 * @return {Object}
 */
const buildPageSettings = (settings, request, server) => {
  const routePrefix = server.realm.modifiers.route.prefix;
  const pageSettings = { ...settings };

  pageSettings.jsonPath = request.query.tags
    ? Utilities.appendQueryString(settings.jsonPath, 'tags', request.query.tags)
    : settings.jsonPath;

  if (routePrefix) {
    ['jsonPath', 'swaggerUIPath'].forEach((setting) => {
      pageSettings[setting] = routePrefix + pageSettings[setting];
    });
  }

  const prefix = findAPIKeyPrefix(settings);
  if (prefix) {
    pageSettings.keyPrefix = prefix;
  }

  return pageSettings;
};

/**
 * builds the HTML string for the documentation page
 *
 * @param  {Object} settings
 * @return {string}
 */
const buildDocsPage = (settings) => {
  const title = escapeHtml(settings.info?.title || '');
  const uiPath = escapeHtml(settings.swaggerUIPath);
  const config = JSON.stringify({
    jsonPath: settings.jsonPath,
    validatorUrl: settings.validatorUrl || null,
    expanded: settings.expanded,
    sortTags: settings.sortTags,
    sortEndpoints: settings.sortEndpoints,
    uiCompleteScript: settings.uiCompleteScript || null,
    tryItOutEnabled: settings.tryItOutEnabled,
    uiOptions: settings.uiOptions || {}
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href="${uiPath}swagger-ui.css" />
    <link rel="icon" type="image/png" href="${uiPath}favicon-32x32.png" sizes="32x32" />
    <link rel="icon" type="image/png" href="${uiPath}favicon-16x16.png" sizes="16x16" />
    <style>
      html {
        box-sizing: border-box;
        overflow: -moz-scrollbars-vertical;
        overflow-y: scroll;
      }
      *,
      *:before,
      *:after {
        box-sizing: inherit;
      }
      body {
        margin: 0;
        background: #fafafa;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${uiPath}swagger-ui-bundle.js"></script>
    <script src="${uiPath}swagger-ui-standalone-preset.js"></script>
    <script src="${uiPath}extend.js" type="text/javascript"></script>
    <script id="hapi-openapi-config" type="application/json">${config}</script>
    <script>
      function getUrlVars() {
        const vars = [];
        let hash;
        const hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for (let i = 0; i < hashes.length; i++) {
          hash = hashes[i].split('=');
          vars.push(hash[0]);
          vars[hash[0]] = hash[1];
        }
        return vars;
      }

      window.onload = function () {
        const cfg = JSON.parse(document.getElementById('hapi-openapi-config').textContent);

        let url = window.location.search.match(/url=([^&]+)/);
        if (url && url.length > 1) {
          url = decodeURIComponent(url[1]);
        } else {
          url = cfg.jsonPath;
        }

        const ACCESS_TOKEN_QUERY_PARAM_NAME = 'access_token';
        const accessToken = getUrlVars()[ACCESS_TOKEN_QUERY_PARAM_NAME];

        const swaggerOptions = {
          url: url + (accessToken ? (url.indexOf('?') < 0 ? '?' : '&') + ACCESS_TOKEN_QUERY_PARAM_NAME + '=' + accessToken : ''),
          validatorUrl: cfg.validatorUrl,
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          plugins: [SwaggerUIBundle.plugins.DownloadUrl],
          layout: 'StandaloneLayout',
          docExpansion: cfg.expanded,
          tagsSorter: apisSorter[cfg.sortTags],
          operationsSorter: operationsSorter[cfg.sortEndpoints],
          onComplete: function () {
            if (cfg.uiCompleteScript) {
              const s = document.createElement('script');
              s.src = cfg.uiCompleteScript;
              s.type = 'text/javascript';
              document.body.appendChild(s);
            }
          },
          tryItOutEnabled: cfg.tryItOutEnabled
        };

        const mergedOptions = { ...swaggerOptions, ...cfg.uiOptions };

        const ui = SwaggerUIBundle(mergedOptions);
        window.ui = ui;
      };
    </script>
  </body>
</html>`;
};

/**
 * Escapes HTML special characters
 *
 * @param {string} str
 * @returns {string}
 */
const escapeHtml = (str) => {
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\'':
        return '&#39;';
      default:
        return m;
    }
  });
};

/**
 * finds any keyPrefix in securityDefinitions - also add x- to name
 *
 * @param  {Object} settings
 * @return {string}
 */
const findAPIKeyPrefix = (settings) => {
  // Need JWT plugin to work with Hapi v17+ to test this again
  /* c8 ignore start */
  let out = '';
  if (settings.securityDefinitions) {
    Object.keys(settings.securityDefinitions).forEach((key) => {
      if (settings.securityDefinitions[key]['x-keyPrefix']) {
        out = settings.securityDefinitions[key]['x-keyPrefix'];
      }
    });
  }

  return out;
  /* c8 ignore stop */
};
