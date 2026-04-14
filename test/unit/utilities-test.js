const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const Joi = require('joi');
const Helper = require('../helper.js');

after(() => Helper.cleanup());
const Utilities = require('../../lib/utilities.js');

describe('utilities', () => {
  it('isObject', () => {
    assert.deepStrictEqual(
      Utilities.isObject(() => {}),
      false
    );
    assert.deepStrictEqual(Utilities.isObject({}), true);
    assert.deepStrictEqual(Utilities.isObject(Joi.object()), true);
    assert.deepStrictEqual(Utilities.isObject(null), false);
    assert.deepStrictEqual(Utilities.isObject(undefined), false);
    assert.deepStrictEqual(Utilities.isObject([]), false);
    assert.deepStrictEqual(Utilities.isObject('string'), false);
    assert.deepStrictEqual(Utilities.isObject(5), false);
  });

  it('isFunction', () => {
    assert.deepStrictEqual(
      Utilities.isFunction(() => {}),
      true
    );
    assert.deepStrictEqual(Utilities.isFunction({}), false);
    assert.deepStrictEqual(Utilities.isFunction(Joi.object()), false);
    assert.deepStrictEqual(Utilities.isFunction(null), false);
    assert.deepStrictEqual(Utilities.isFunction(undefined), false);
    assert.deepStrictEqual(Utilities.isFunction([]), false);
    assert.deepStrictEqual(Utilities.isFunction('string'), false);
    assert.deepStrictEqual(Utilities.isFunction(5), false);
  });

  it('isRegex', () => {
    assert.deepStrictEqual(Utilities.isRegex(undefined), false);
    assert.deepStrictEqual(Utilities.isRegex(null), false);
    assert.deepStrictEqual(Utilities.isRegex(false), false);
    assert.deepStrictEqual(Utilities.isRegex(true), false);
    assert.deepStrictEqual(Utilities.isRegex(42), false);
    assert.deepStrictEqual(Utilities.isRegex('string'), false);
    assert.deepStrictEqual(
      Utilities.isRegex(() => {}),
      false
    );
    assert.deepStrictEqual(Utilities.isRegex([]), false);
    assert.deepStrictEqual(Utilities.isRegex({}), false);

    assert.deepStrictEqual(Utilities.isRegex(/a/g), true);
    assert.deepStrictEqual(Utilities.isRegex(new RegExp('a', 'g')), true);
  });

  it('hasProperties', () => {
    assert.deepStrictEqual(Utilities.hasProperties({}), false);
    assert.deepStrictEqual(Utilities.hasProperties({ name: 'test' }), true);
    assert.deepStrictEqual(Utilities.hasProperties(Helper.objWithNoOwnProperty()), false);
  });

  it('deleteEmptyProperties', () => {
    //console.log( JSON.stringify(Utilities.deleteEmptyProperties(objWithNoOwnProperty())) );
    assert.deepStrictEqual(Utilities.deleteEmptyProperties({}), {});
    assert.deepStrictEqual(Utilities.deleteEmptyProperties({ name: 'test' }), { name: 'test' });
    assert.deepStrictEqual(Utilities.deleteEmptyProperties({ name: null }), {});
    assert.deepStrictEqual(Utilities.deleteEmptyProperties({ name: undefined }), {});
    assert.deepStrictEqual(Utilities.deleteEmptyProperties({ name: [] }), {});
    assert.deepStrictEqual(Utilities.deleteEmptyProperties({ name: {} }), {});

    assert.deepStrictEqual(Utilities.deleteEmptyProperties({ example: [], default: [] }), { example: [], default: [] });
    assert.deepStrictEqual(Utilities.deleteEmptyProperties({ example: {}, default: {} }), { example: {}, default: {} });
    // this needs JSON.stringify to compare outputs
    assert.deepStrictEqual(JSON.stringify(Utilities.deleteEmptyProperties(Helper.objWithNoOwnProperty())), '{}');
  });

  it('first', () => {
    assert.deepStrictEqual(Utilities.first({}), undefined);
    assert.deepStrictEqual(Utilities.first('test'), undefined);
    assert.deepStrictEqual(Utilities.first([]), undefined);
    assert.deepStrictEqual(Utilities.first(['test']), 'test');
    assert.deepStrictEqual(Utilities.first(['one', 'two']), 'one');
  });

  it('hasKey', () => {
    assert.deepStrictEqual(Utilities.hasKey({}, 'x'), false);
    assert.deepStrictEqual(Utilities.hasKey([], 'x'), false);
    assert.deepStrictEqual(Utilities.hasKey(null, 'x'), false);
    assert.deepStrictEqual(Utilities.hasKey(undefined, 'x'), false);

    assert.deepStrictEqual(Utilities.hasKey({ x: 1 }, 'x'), true);
    assert.deepStrictEqual(Utilities.hasKey({ a: { x: 1 } }, 'x'), true);
    assert.deepStrictEqual(Utilities.hasKey({ a: { b: { x: 1 } } }, 'x'), true);
    assert.deepStrictEqual(Utilities.hasKey({ x: 1, z: 2 }, 'x'), true);
    assert.deepStrictEqual(Utilities.hasKey({ xx: 1 }, 'x'), false);

    assert.deepStrictEqual(Utilities.hasKey([{ x: 1 }], 'x'), true);
    assert.deepStrictEqual(Utilities.hasKey({ a: [{ x: 1 }] }, 'x'), true);

    assert.deepStrictEqual(Utilities.hasKey(Helper.objWithNoOwnProperty(), 'x'), false);
    assert.deepStrictEqual(Utilities.hasKey({ a: {} }, 'x'), false);
  });

  it('findAndRenameKey', () => {
    assert.deepStrictEqual(Utilities.findAndRenameKey({}, 'x', 'y'), {});
    assert.deepStrictEqual(Utilities.findAndRenameKey([], 'x', 'y'), []);
    assert.deepStrictEqual(Utilities.findAndRenameKey(null, 'x', 'y'), null);
    assert.deepStrictEqual(Utilities.findAndRenameKey(undefined, 'x', 'y'), undefined);

    assert.deepStrictEqual(Utilities.findAndRenameKey({ x: 1 }, 'x', 'y'), { y: 1 });
    assert.deepStrictEqual(Utilities.findAndRenameKey({ a: { x: 1 } }, 'x', 'y'), { a: { y: 1 } });
    assert.deepStrictEqual(Utilities.findAndRenameKey({ a: { b: { x: 1 } } }, 'x', 'y'), { a: { b: { y: 1 } } });
    assert.deepStrictEqual(Utilities.findAndRenameKey({ x: 1, z: 2 }, 'x', 'y'), { y: 1, z: 2 });
    assert.deepStrictEqual(Utilities.findAndRenameKey({ xx: 1 }, 'x', 'y'), { xx: 1 });

    assert.deepStrictEqual(Utilities.findAndRenameKey([{ x: 1 }], 'x', 'y'), [{ y: 1 }]);
    assert.deepStrictEqual(Utilities.findAndRenameKey({ a: [{ x: 1 }] }, 'x', 'y'), { a: [{ y: 1 }] });

    assert.deepStrictEqual(Utilities.findAndRenameKey({ x: 1 }, 'x', null), {});
    assert.deepStrictEqual(Utilities.findAndRenameKey({ x: 1, z: 2 }, 'x', null), { z: 2 });

    assert.deepStrictEqual(Utilities.findAndRenameKey(Helper.objWithNoOwnProperty(), 'x', 'y'), {});
  });

  it('first', () => {
    assert.deepStrictEqual(Utilities.first([]), undefined);
    assert.deepStrictEqual(Utilities.first({}), undefined);
    assert.deepStrictEqual(Utilities.first(['a', 'b']), 'a');
  });

  it('sortFirstItem', () => {
    assert.deepStrictEqual(Utilities.sortFirstItem(['a', 'b']), ['a', 'b']);

    assert.deepStrictEqual(Utilities.sortFirstItem(['b', 'a'], 'a'), ['a', 'b']);
    assert.deepStrictEqual(Utilities.sortFirstItem(['b', 'a'], 'b'), ['b', 'a']);

    assert.deepStrictEqual(Utilities.sortFirstItem(['b', 'a', 'c'], 'a'), ['a', 'b', 'c']);
    assert.deepStrictEqual(Utilities.sortFirstItem(['c', 'b', 'a'], 'a'), ['a', 'c', 'b']);

    // Make sure that the function makes a deep copy of the input array and does not change the arguments
    const input = ['b', 'a'];
    const copyOfInput = ['b', 'a'];
    assert.deepStrictEqual(Utilities.sortFirstItem(input, 'a'), ['a', 'b']);
    assert.deepStrictEqual(input, copyOfInput);
  });

  it('replaceValue', () => {
    assert.deepStrictEqual(Utilities.replaceValue(['a', 'b'], 'a', 'c'), ['c', 'b']);
    assert.deepStrictEqual(Utilities.replaceValue(['a', 'b'], null, null), ['a', 'b']);
    assert.deepStrictEqual(Utilities.replaceValue(['a', 'b'], 'a', null), ['a', 'b']);
    assert.deepStrictEqual(Utilities.replaceValue(null, null, null), null);
    assert.deepStrictEqual(Utilities.replaceValue(), undefined);
  });

  it('removeProps', () => {
    assert.deepStrictEqual(Utilities.removeProps({ a: 1, b: 2 }, ['a']), { a: 1 });
    assert.deepStrictEqual(Utilities.removeProps({ a: 1, b: 2 }, ['a', 'b']), { a: 1, b: 2 });
    assert.deepStrictEqual(Utilities.removeProps({ a: 1, b: 2 }, ['c']), {});
    assert.deepStrictEqual(Utilities.removeProps(Helper.objWithNoOwnProperty(), ['b']), {});
  });

  it('isJoi', () => {
    assert.deepStrictEqual(Utilities.isJoi({}), false);
    assert.deepStrictEqual(Utilities.isJoi(Joi.object()), true);
    assert.deepStrictEqual(
      Utilities.isJoi(
        Joi.object({
          id: Joi.string()
        })
      ),
      true
    );
  });

  it('hasJoiChildren', () => {
    assert.deepStrictEqual(Utilities.hasJoiChildren({}), false);
    assert.deepStrictEqual(Utilities.hasJoiChildren(Joi.object()), false);
    assert.deepStrictEqual(
      Utilities.hasJoiChildren(
        Joi.object({
          id: Joi.string()
        })
      ),
      true
    );
  });

  it('hasJoiDescription', () => {
    assert.deepStrictEqual(Utilities.hasJoiDescription({}), false);
    assert.deepStrictEqual(Utilities.hasJoiDescription(Joi.object()), false);
    assert.deepStrictEqual(Utilities.hasJoiDescription(Joi.object().description('MyDescription')), true);
    assert.deepStrictEqual(
      Utilities.hasJoiDescription(
        Joi.object({
          id: Joi.string()
        })
      ),
      false
    );
    assert.deepStrictEqual(
      Utilities.hasJoiDescription(
        Joi.object({
          id: Joi.string()
        }).description('testDescription')
      ),
      true
    );
  });

  it('toJoiObject', () => {
    assert.deepStrictEqual(Joi.isSchema(Utilities.toJoiObject([])), false);
    assert.deepStrictEqual(Joi.isSchema(Utilities.toJoiObject(Object.create(null))), true);
    assert.deepStrictEqual(Joi.isSchema(Utilities.toJoiObject({})), true);
    assert.deepStrictEqual(Joi.isSchema(Utilities.toJoiObject(Joi.object())), true);
  });

  it('hasJoiMeta', () => {
    assert.deepStrictEqual(Utilities.hasJoiMeta({}), false);
    assert.deepStrictEqual(Utilities.hasJoiMeta(Joi.object()), false);
    assert.deepStrictEqual(Utilities.hasJoiMeta(Joi.object().meta({ test: 'test' })), true);
  });

  it('getJoiMetaProperty', () => {
    assert.deepStrictEqual(Utilities.getJoiMetaProperty({}, 'test'), undefined);
    assert.deepStrictEqual(Utilities.getJoiMetaProperty(Joi.object(), 'test'), undefined);
    assert.deepStrictEqual(Utilities.getJoiMetaProperty(Joi.object().meta({ test: 'test' }), 'test'), 'test');
    assert.deepStrictEqual(Utilities.getJoiMetaProperty(Joi.object().meta({ test: 'test' }), 'nomatch'), undefined);
  });

  it('getJoiLabel', () => {
    assert.deepStrictEqual(Utilities.getJoiLabel({}), null);
    assert.deepStrictEqual(Utilities.getJoiLabel(Joi.object()), null);
    assert.deepStrictEqual(Utilities.getJoiLabel(Joi.object().label('MySchema')), 'MySchema');

    assert.deepStrictEqual(
      Utilities.getJoiLabel(
        Joi.object({
          id: Joi.string()
        })
      ),
      null
    );

    assert.deepStrictEqual(
      Utilities.getJoiLabel(
        Joi.object({
          id: Joi.string()
        }).description('MyDescription')
      ),
      null
    );

    assert.deepStrictEqual(
      Utilities.getJoiLabel(
        Joi.object({
          id: Joi.string()
        })
          .description('testDescription')
          .label('MyLabel')
      ),
      'MyLabel'
    );
  });

  it('toTitleCase', () => {
    assert.deepStrictEqual(Utilities.toTitleCase('test'), 'Test');
    assert.deepStrictEqual(Utilities.toTitleCase('tesT'), 'Test');
    assert.deepStrictEqual(Utilities.toTitleCase('Test'), 'Test');
    assert.deepStrictEqual(Utilities.toTitleCase('test Test'), 'Test test');
  });

  it('createId', () => {
    assert.deepStrictEqual(Utilities.createId('PUT', 'v1/sum/add/{a}/{b}'), 'putV1SumAddAB');
    assert.deepStrictEqual(Utilities.createId('PUT', 'sum'), 'putSum');
  });

  it('replaceInPath', () => {
    const pathReplacements = [
      {
        replaceIn: 'all',
        pattern: /v([0-9]+)\//,
        replacement: ''
      },
      {
        replaceIn: 'groups',
        pattern: /[.].*$/,
        replacement: ''
      }
    ];

    assert.deepStrictEqual(Utilities.replaceInPath('api/v1/users', ['endpoints'], pathReplacements), 'api/users');
    assert.deepStrictEqual(Utilities.replaceInPath('api/v2/users', ['groups'], pathReplacements), 'api/users');
    assert.deepStrictEqual(Utilities.replaceInPath('api/users.get', ['groups'], pathReplacements), 'api/users');
    assert.deepStrictEqual(Utilities.replaceInPath('api/users.search', ['groups'], pathReplacements), 'api/users');
  });

  it('removeTrailingSlash', () => {
    assert.deepStrictEqual(Utilities.removeTrailingSlash('api/v1/users'), 'api/v1/users');
    assert.deepStrictEqual(Utilities.removeTrailingSlash('api/v1/users/'), 'api/v1/users');
    assert.deepStrictEqual(Utilities.removeTrailingSlash('/api/v1/users'), '/api/v1/users');
    assert.deepStrictEqual(Utilities.removeTrailingSlash('/api/v1/users/'), '/api/v1/users');
  });

  it('mergeVendorExtensions', () => {
    assert.deepStrictEqual(Utilities.assignVendorExtensions({ a: 1, b: 2 }, { 'x-a': 1, 'x-b': 2, c: 3 }), {
      a: 1,
      b: 2,
      'x-a': 1,
      'x-b': 2
    });
    assert.deepStrictEqual(Utilities.assignVendorExtensions({ a: 1, b: 2 }, null), { a: 1, b: 2 });
    assert.deepStrictEqual(Utilities.assignVendorExtensions(null, null), null);
    assert.deepStrictEqual(Utilities.assignVendorExtensions(null, { 'x-a': 1, 'x-b': 2, c: 3 }), null);
    assert.deepStrictEqual(Utilities.assignVendorExtensions({ a: 1, b: 2 }, { 'x-a': 1, 'x-b': null, c: 3 }), {
      a: 1,
      b: 2,
      'x-a': 1,
      'x-b': null
    });
    assert.deepStrictEqual(Utilities.assignVendorExtensions({ a: 1, b: 2, 'x-a': 100 }, { 'x-a': 1, 'x-b': 2, c: 3 }), {
      a: 1,
      b: 2,
      'x-a': 1,
      'x-b': 2
    });
    assert.deepStrictEqual(Utilities.assignVendorExtensions({ a: 1, b: 2 }, { 'x-': 1 }), { a: 1, b: 2 });
  });

  it('appendQueryString', () => {
    assert.deepStrictEqual(Utilities.appendQueryString('/test.json', 'tags', 'reduced'), '/test.json?tags=reduced');
    assert.deepStrictEqual(Utilities.appendQueryString('/test/test', 'tags', 'reduced'), '/test/test?tags=reduced');
    assert.deepStrictEqual(
      Utilities.appendQueryString('/test/test?tags=reduced', 'tags', 'reduced'),
      '/test/test?tags=reduced'
    );
    assert.deepStrictEqual(
      Utilities.appendQueryString('/test/test?tags=reduced', 'tags', 'api'),
      '/test/test?tags=api'
    );
    assert.deepStrictEqual(Utilities.appendQueryString('/swagger.json'), '/swagger.json');
    assert.deepStrictEqual(Utilities.appendQueryString('/swagger.json', 'query'), '/swagger.json');
    assert.deepStrictEqual(Utilities.appendQueryString('/swagger.json', '', 'query'), '/swagger.json');
  });
});
