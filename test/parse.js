var assert = require('assert');
var parse = require('../lib/parser');
var walkAll = require('../lib/utils/walk').all;
var translate = require('../lib/utils/translate');
var forEachParseTest = require('./fixture/parse').forEachTest;
var stringify = require('./helpers/stringify');

function repeat(str, count) {
    return new Array(count + 1).join(str);
}

function createParseErrorTest(name, test, options) {
    it(name + ' ' + JSON.stringify(test.source), function() {
        var error;

        assert.throws(function() {
            parse(test.source, options);
        }, function(e) {
            error = e;
            if (e.parseError) {
                return true;
            }
        }, 'Should be a CSS parse error');

        assert.equal(error.message, test.error);
        assert.deepEqual(error.parseError, test.position);
    });
}

describe('parse', function() {
    describe('basic', function() {
        forEachParseTest(function createParseTest(name, test, context) {
            it(name, function() {
                var ast = parse(test.source, {
                    context: context
                });

                // AST should be equal
                assert.equal(stringify(ast), stringify(test.ast));

                // translated AST should be equal to original source
                assert.equal(translate(ast), 'translate' in test ? test.translate : test.source);
            });
        });
    });

    describe('context', function() {
        it('wrong context', function() {
            assert.throws(function() {
                parse('a{}', { context: 'unknown' });
            }, 'Unknown context `unknown`');
        });
    });

    describe('parse errors', function() {
        forEachParseTest(function(name, test, context) {
            createParseErrorTest(name, test, {
                context: context,
                positions: false
            });
            createParseErrorTest(name + ' (with positions)', test, {
                context: context,
                positions: true
            });
        }, true);

        it('formattedMessage', function() {
            try {
                parse('/**/\n.\nfoo');
            } catch (e) {
                assert.equal(e.formattedMessage,
                    'Parse error: Identifier is expected\n' +
                    '    1 |/**/\n' +
                    '    2 |.\n' +
                    '--------^\n' +
                    '    3 |foo'
                );
                assert.equal(e.sourceFragment(),
                    '    2 |.\n' +
                    '--------^\n'
                );
                assert.equal(e.sourceFragment(3),
                    '    1 |/**/\n' +
                    '    2 |.\n' +
                    '--------^\n' +
                    '    3 |foo'
                );
            }
        });

        it('formattedMessage for source with long lines', function() {
            try {
                parse(
                    '/*' + repeat('1234567890', 20) + '*/\n' +
                    repeat(' ', 117) + '.\n' +
                    'foo\n' +
                    repeat(' ', 120) + 'bar'
                );
            } catch (e) {
                assert.equal(e.formattedMessage,
                    'Parse error: Identifier is expected\n' +
                    '    1 |…12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678…\n' +
                    '    2 |…                                                       .\n' +
                    '----------------------------------------------------------------^\n' +
                    '    3 |\n' +
                    '    4 |…                                                          bar'
                );
            }
        });
    });

    describe('positions', function() {
        it('should start with line 1 column 1 by default', function() {
            var ast = parse('.foo.bar {\n  property: value 123 123.4 .123 123px 99% #fff url( a ) / var( --a ), "test" \'test\';\n}', {
                positions: true
            });
            var positions = [];

            walkAll(ast, function(node) {
                if (node.info) {
                    positions.unshift([node.info.line, node.info.column, node.type]);
                }
            });

            assert.deepEqual(positions, [
                [1, 1, 'StyleSheet'],
                [1, 1, 'Rule'],
                [1, 10, 'Block'],
                [2, 3, 'Declaration'],
                [2, 12, 'Value'],
                [2, 79, 'String'],
                [2, 72, 'String'],
                [2, 70, 'Operator'],
                [2, 60, 'Function'],
                [2, 65, 'Identifier'],
                [2, 58, 'Operator'],
                [2, 49, 'Url'],
                [2, 54, 'Raw'],
                [2, 44, 'Hash'],
                [2, 40, 'Percentage'],
                [2, 34, 'Dimension'],
                [2, 29, 'Number'],
                [2, 23, 'Number'],
                [2, 19, 'Number'],
                [2, 13, 'Identifier'],
                [1, 1, 'Selector'],
                [1, 1, 'SimpleSelector'],
                [1, 5, 'Class'],
                [1, 1, 'Class']
            ]);
        });

        it('should start with specified line and column', function() {
            var ast = parse('.foo.bar {\n  property: value 123 123.4 .123 123px 99% #fff url( a ) / var( --a ), "test" \'test\';\n}', {
                positions: true,
                line: 3,
                column: 5
            });
            var positions = [];

            walkAll(ast, function(node) {
                if (node.info) {
                    positions.unshift([node.info.line, node.info.column, node.type]);
                }
            });

            assert.deepEqual(positions, [
                [3, 5, 'StyleSheet'],
                [3, 5, 'Rule'],
                [3, 14, 'Block'],
                [4, 3, 'Declaration'],
                [4, 12, 'Value'],
                [4, 79, 'String'],
                [4, 72, 'String'],
                [4, 70, 'Operator'],
                [4, 60, 'Function'],
                [4, 65, 'Identifier'],
                [4, 58, 'Operator'],
                [4, 49, 'Url'],
                [4, 54, 'Raw'],
                [4, 44, 'Hash'],
                [4, 40, 'Percentage'],
                [4, 34, 'Dimension'],
                [4, 29, 'Number'],
                [4, 23, 'Number'],
                [4, 19, 'Number'],
                [4, 13, 'Identifier'],
                [3, 5, 'Selector'],
                [3, 5, 'SimpleSelector'],
                [3, 9, 'Class'],
                [3, 5, 'Class']
            ]);
        });
    });
});
