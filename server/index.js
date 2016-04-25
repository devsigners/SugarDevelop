'use strict';

const path = require('path');
const Koa = require('koa');
const logger = require('koa-logger');
const serve = require('koa-static');
const hbs = require('./koa-hbs/index.js');
const config = require('../config');

const app = new Koa();

app.use(logger());

app.use(serve(config.staticRoot, {
    defer: true
}));

const isRequestHtml = (ctx) => {
    return ctx.accepts('html');
};
// attach ctx.render
app.use(hbs(config.hbs));
// decide when to use koa-hbs and which template
app.use((ctx, next) => {
    if (ctx.method.toLowerCase() !== 'get' || !isRequestHtml(ctx)) return next();
    const extname = path.extname(ctx.path);
    if (extname && extname !== config.hbs.extname) return next();

    return ctx.render(ctx.path).then(() => {
        return next();
    }).catch(err => {
        config.hbs.onerror(err, ctx, next);
    });
});

app.listen(config.server.port, config.server.host, (err) => {
    console.log(err || `server run at http://${config.server.host}:${config.server.port}`);
});
