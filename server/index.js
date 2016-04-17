'use strict';

const path = require('path');
const Koa = require('koa');
const logger = require('koa-logger');
const serve = require('koa-static');
const hbs = require('./koa-hbs');

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
const tplExt = '.html';
app.use(hbs({
    viewPath: path.join(__dirname, '../front/src/views'),
    partialPath: path.join(__dirname, '../front/src/views/partials'),
    layoutPath: path.join(__dirname, '../front/src/views/layouts'),
    helperPath: path.join(__dirname, '../front/src/views/helpers'),
    dataPath: path.join(__dirname, '../front/src/views/data'),
    defaultLayout: 'index',
    extname: tplExt
}));
app.use((ctx, next) => {
    if (ctx.method.toLowerCase() !== 'get' || !isRequestHtml(ctx)) return next();
    const extname = path.extname(ctx.path);
    if (extname && extname !== tplExt) return next();

    const name = (extname ? ctx.path.slice(0, - extname.length) :
        path.resolve(ctx.path, 'index')).replace(/^\//, '');
    console.log(ctx.method, name);
    return ctx.render(name).then(() => {
        console.log('success', this.status);
        next();
    }).catch(err => {
        console.log('err', err);
    });
});

app.listen(3000, (err) => {
    console.log(err || 'server run at 3000');
});
