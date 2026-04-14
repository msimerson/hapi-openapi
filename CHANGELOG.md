The format is based on [Keep a Changelog](https://keepachangelog.com/).

# CHANGES

### Unreleased

### [18.0.0] - 2026-04-13

The major focus of this release was joi 18 and transforming this into a more svelte, secure, and maintainable module with a dramatically smaller install, no unmaintained dependencies, and a greatly reduced attack surface.

- drop support for node < 22
- test: initialize vs port listeners, so tests exit properly
- shrank dependencies from 535 to 141
- test runner: @hapi/lab -> node:test
- hapi-auth-jwt2 + jsonwebtoken → @hapi/basic
- lint-staged removed — .husky/pre-commit now runs pnpm lint directly
- tsd → tsc --noEmit — tsconfig.json created targeting index.d.ts + index.test-d.ts
- @types/node added (needed by @hapi/hapi's own types)
- eslint 7 → 10
- delete: @babel/core + @babel/eslint-parser
- swagger-parser reclassified to optionalDependencies
- hapi-auth-bearer-token → hapi-auth-jwt2
- @hapi/wreck → node:stream/consumers
- @hapi/boom — removed (replaced with h.response().code(401))
- delete: @hapi/code, @hapi/eslint-plugin
- @hapi/hoek removed — all 64 usages replaced with native JS (optional chaining, spread, isDeepStrictEqual, Array#filter/includes)
- @apidevtools/json-schema-ref-parser demoted to optionalDependencies with lazy-require
- swagger-ui-dist lazy-loaded — only required inside the documentationPage/swaggerUI gate
- swagger-parser bug fixed — was a devDep used at runtime; now lazy-required
- is-ci removed — replaced with inline process.env.CI check
- fixes hapi-swagger/hapi-swagger#1072

### [17] - OLDER RELEASES

- see [https://github.com/hapi-swagger/hapi-swagger](https://github.com/hapi-swagger/hapi-swagger)