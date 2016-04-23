'use strict';

const Hbs = require('./hbs');
const merge = require('./util').merge;

const createRenderer = (hbs) => {
    // assume this is bind to koa instance
    return function(name, locals) {
        locals = locals || {};
        merge(locals, this.state, hbs.locals);
        return hbs.render(name, locals).then((html) => {
            this.body = html;
        });
    };
};

exports = module.exports = (options) => {
    const hbs = new Hbs(options);
    const render = createRenderer(hbs);
    return (ctx, next) => {
        ctx.render = render;
        return next();
    };
};

exports.Hbs = Hbs;
