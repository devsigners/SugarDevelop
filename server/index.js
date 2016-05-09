'use strict';

const path = require('path');
const Koa = require('koa');
const logger = require('koa-logger');
const serve = require('koa-static');
const mount = require('koa-mount');
const hbs = require('./koa-hbs/index.js');
const config = require('../config');

const app = new Koa();

app.use(logger());
// attach ctx.render
app.use(hbs(config.hbs));

app.use(serve(config.staticRoot, {
    defer: true
}));

const serveViewer = serve(config.viewer.dest);
app.use(mount('/viewer', (ctx, next) => {
    let promise = renderView(ctx, next) || next();
    return promise.then(() => {
        if (ctx.body == null) {
            return serveViewer(ctx, next);
        }
        return '__isView__';
    }).then((flag) => {
        // insert script
        if (typeof ctx.body === 'string' && flag === '__isView__' && ctx.query.__disable__ !== 'yes') {
            let extname = path.extname(ctx.path);
            let dir = extname ? path.dirname(ctx.path) : ctx.path;
            if (dir.slice(-1)[0] === '/') {
                dir = dir.slice(0, -1);
            }
            ctx.body = ctx.body.replace(/<\/head>/, `<script src="${dir}/components.js"><\/script></head>`);
        }
    });
}));

const isRequestHtml = (ctx) => {
    return ctx.accepts('html');
};
const renderView = (ctx, next) => {
    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return;
    if (ctx.body != null || ctx.status !== 404 || !isRequestHtml(ctx)) return;
    const extname = path.extname(ctx.path);
    if (extname && extname !== config.hbs.extname) return;

    return ctx.render(ctx.path).then(() => {
        return next();
    }).catch(err => {
        config.hbs.onerror(err, ctx, next);
    });
};

// decide when to use koa-hbs and which template
app.use(renderView);

app.listen(config.server.port, config.server.host, (err) => {
    console.log(err || `server run at http://${config.server.host}:${config.server.port}`);
});
