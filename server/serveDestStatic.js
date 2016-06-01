'use strict';

const Koa = require('koa');
const logger = require('koa-logger');
const serve = require('koa-static');
const config = require('../config');

const app = new Koa();

app.use(logger());

app.use(serve(config.buildStatic.dest, {
    defer: true,
    hidden: true
}));

app.listen(config.buildStatic.port, config.server.host, (err) => {
    console.log(err || `server run at http://${config.server.host}:${config.buildStatic.port}`);
});
