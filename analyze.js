const babelParser = require('@babel/parser');
const { default: traverse } = require('@babel/traverse');
const { default: generate } = require('@babel/generator');
const { isIdentifier, isMemberExpression } = require('@babel/types');

const UNKNOWN_VALUE = { toString: function() { return '{???}'; } }
const memory = new Map(); // variables

function evalExpr(node, scope) {
    switch(node.type) {
    case 'StringLiteral':
        return node.value;
    case 'Identifier':
        const binding = scope.getBinding(node.name);
        if (memory.has(binding)) {
            return memory.get(binding);
        }
        break;
    case 'BinaryExpression':
        if (node.operator === '+') {
            return evalExpr(node.left, scope) + evalExpr(node.right, scope);
        }
        break;        
    }
    return UNKNOWN_VALUE;
}
function setVariable(varNode, valueNode, scope) {
    if (varNode.type === 'Identifier') {
        const binding = scope.getBinding(varNode.name);
        memory.set(binding, evalExpr(valueNode, scope));
    }
}

function analyze(code) {
    const ast = babelParser.parse(code);

    traverse(ast, {
        VariableDeclarator: function(path) {
            if (path.node.init) {
                setVariable(path.node.id, path.node.init, path.scope);
            }
        },
        // process assignments, not only initializations
        AssignmentExpression: function(path) {
            if (path.node.operator === '=') {
                setVariable(path.node.left, path.node.right, path.scope);
            }
        },
        CallExpression: function(path) {
            const node = path.node;
            const callee = node.callee;
            let ajaxFunction = null;
            if (isIdentifier(callee, { name: 'fetch' })) {
                ajaxFunction = 'fetch';
            } else if (
                isMemberExpression(callee) && isIdentifier(callee.object, { name: '$'}) &&
                isIdentifier(callee.property, { name: 'ajax'})
            ) {
                ajaxFunction = '$.ajax';
            }
            if (ajaxFunction) {
                const args = [];
                for (const argNode of node.arguments) {
                    const value = evalExpr(argNode, path.scope);
                    if (value !== UNKNOWN_VALUE) {
                        args.push(JSON.stringify(value));
                    } else {
                        args.push(generate(argNode).code);
                    }
                }
                console.log(`${ajaxFunction}(${args.join(',')})`);
            }
        }
    });
}

function runOnLocalJSFile() {
    const fs = require('fs');

    const inputFile = process.argv.length >= 3 ? process.argv[2] : 'sample.js';

    const code = fs.readFileSync(inputFile, 'utf8');
    analyze(code);
}

// this is to allow both importing this file and running it
module.exports.analyze = analyze;
if (require.main === module) {
    runOnLocalJSFile();
}
