'use strict';

const Handlebars = require('handlebars');
const sharedPathRe = require('./util').sharedPathRe;

const processHelper = (block, ret, alwaysHelper) => {
    if (alwaysHelper || Handlebars.AST.helpers.helperExpression(block)) {
        let name = block.path.original;
        ret.push({ name });
        if (sharedPathRe.test(name)) {
            block.path.original = block.path.original.replace(sharedPathRe, '');
            block.path.parts[0] = block.path.parts[0].replace(sharedPathRe, '');
        }
    }
};

// The Scanner is used to search dependencies (partials and helpers) of template,
// So it's possible to do lazy load
class Scanner extends Handlebars.Visitor {
    constructor() {
        super();
        this.reset();
    }
    reset() {
        this.partials = [];
        this.helpers = [];
    }
    //
    // TODO: continue to improve helper/partial capture
    //
    MustacheStatement(block) {
        processHelper(block, this.helpers);
        super.MustacheStatement(block);
    }
    BlockStatement(block) {
        // assume BlockStatement is always helper.
        // why?
        // {{#noop}}{{body}}{{/noop}} is surely for noop helper
        // but Handlebars.AST.helpers.helperExpression(block) would return false
        // TODO:
        // umm, should dig deep into it but not now.
        processHelper(block, this.helpers, true);
        super.BlockStatement(block);
    }
    PartialStatement(partial) {
        let dynamic = partial.name.type === 'SubExpression' ? {
            name: partial.name.path.original,
            context: partial.name.params[0].original,
        } : null;
        this.partials.push({
            dynamic,
            name: partial.name.original,
            hash: partial.hash && partial.hash.pairs
        });
        super.PartialStatement(partial);
    }
}

module.exports = Scanner;
