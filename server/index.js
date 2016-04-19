'use strict';

const path = require('path');
const Koa = require('koa');
const logger = require('koa-logger');
const serve = require('koa-static');
const hbs = require('./koa-hbs');
const config = require('../config');

const app = new Koa();

app.use(logger());

app.use(serve(path.resolve(__dirname, '../front/src'), {
    defer: true
}));

const isRequestHtml = (ctx) => {
    let isHtml = ctx.is('html');
    if (isHtml === null && /html/.test(ctx.headers.accept)) {
        isHtml = true;
    }
    return isHtml;
};
// attach ctx.render
app.use(hbs(config.hbsOptions));
// decide when to use koa-hbs and which template
app.use((ctx, next) => {
    if (ctx.method.toLowerCase() !== 'get' || !isRequestHtml(ctx)) return next();
    const extname = path.extname(ctx.path);
    if (extname && extname !== config.hbsOptions.extname) return next();

    const name = (extname ? ctx.path.slice(0, - extname.length) :
        path.join(ctx.path, 'index')).slice(1); // first char maybe '/' or '\', just remove it
    return ctx.render(name).then(() => {
        next();
    }).catch(err => {
        config.hbsOnerror(err, ctx, next);
    });
});

app.listen(config.server.port, config.server.host, (err) => {
    console.log(err || `server run at http://${config.server.host}:${config.server.port}`);
});
