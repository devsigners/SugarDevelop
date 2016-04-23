'use strict';

const Handlebars = require('handlebars');

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
        if (Handlebars.AST.helpers.helperExpression(block)) {
            this.helpers.push({
                name: block.path.original
            });
        }
        super.MustacheStatement(block);
    }
    BlockStatement(block) {
        this.helpers.push({
            name: block.path.original
        });
        super.BlockStatement(block);
    }
    PartialStatement(partial) {
        this.partials.push({
            name: partial.name.original,
            hash: partial.hash && partial.hash.pairs
        });
        super.PartialStatement(partial);
    }
}

module.exports = Scanner;
