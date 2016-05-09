'use strict';

const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const glob = require('glob-all');
const util = require('../server/koa-hbs/util');

const mkdir = (dir) => {
    return new Promise((resolve, reject) => {
        mkdirp(dir, (err) => err ? reject(err) : resolve());
    });
};

const list = (root, pattern) => {
    return new Promise(function(resolve, reject) {
        glob(pattern, root ? {
            cwd: root
        } : {}, (err, data) =>  err ? reject(err) : resolve(data));
    });
};

const write = (filename, content, createDirIfNotExists) => {
    return new Promise((resolve, reject) => {
        let dir = createDirIfNotExists && filename && path.parse(filename).dir;
        let promise = createDirIfNotExists ? util.exist(dir).catch(() => {
            return mkdir(dir);
        }) : Promise.resolve(null);
        promise.then(() => {
            fs.writeFile(filename, content, {
                encoding: 'utf8'
            }, (err) => err ? reject(err) : resolve());
        });
    });
};

exports = module.exports = {
    mkdir,
    list,
    write
};

util.merge(exports, util);
