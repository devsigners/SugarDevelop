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

const write = (filename, content, createDirIfNotExists, options) => {
    return new Promise((resolve, reject) => {
        let dir = createDirIfNotExists && filename && path.parse(filename).dir;
        let promise = createDirIfNotExists ? util.exist(dir).catch(() => {
            return mkdir(dir);
        }) : Promise.resolve(null);
        promise.then(() => {
            fs.writeFile(filename, content, options || {
                encoding: 'utf8'
            }, (err) => err ? reject(err) : resolve());
        });
    });
};

const readlinkSync = (url) => {
    const parts = url.split(path.sep);
    let realUrl = '';
    let part;
    let isAbsolute = parts[0] === '';
    while ((part = parts.shift()) != null) {
        if (part === '') {
            realUrl += '/';
        } else {
            realUrl = path.join(realUrl, part);
            let stat = fs.lstatSync(realUrl);
            if (stat.isSymbolicLink()) {
                // '/tmp' --> 'private/tmp', loss absolute
                realUrl = fs.readlinkSync(realUrl);
            }
            if (isAbsolute) {
                realUrl = path.join('/', realUrl)
            }
        }
    }
    return realUrl;
};

exports = module.exports = {
    mkdir,
    list,
    write,
    readlinkSync
};

util.merge(exports, util);
