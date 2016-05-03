'use strict';

const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const glob = require('glob-all');

const KoaHbs = require('../server/koa-hbs');
let config = require('../config').hbs;
const util = require('../server/koa-hbs/util');

const Hbs = KoaHbs.Hbs;
const loadConfig = KoaHbs.loadConfig;
const parseUrl = KoaHbs.parseUrl;
const createRenderer = KoaHbs.createRenderer;

config = util.merge({}, Hbs.defaults, config);

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

const hbsInstance = new Hbs(config);
hbsInstance._genPartialComment = () => null;
list(config.root, [
    '**/*' + config.extname,
    '!' + config.shared + '/**/*' + config.extname
]).then(files => {
    let localConfigPromises = files.map(file => {
        let info = parseUrl(file, config.isProjectGroup);
        return loadConfig(info.projectName, config, hbsInstance.cache).then(localConfig => {
            info.realFileName = file;
            info.config = localConfig;
            const reLayout = new RegExp('^' + (localConfig.layout || config.layout));
            const rePartial = new RegExp('^' + (localConfig.partial || config.partial));
            if (reLayout.test(info.viewName) || rePartial.test(info.viewName)) {
                info.invalid = true;
            }
            debugger;
            return info;
        });
    });
    return Promise.all(localConfigPromises);
}).then(infoList => {
    let promise = Promise.resolve();
    infoList.filter(info => {
        return !info.invalid;
    }).forEach(info => {
        promise = promise.then(() => {
            return hbsInstance.render(path.resolve(config.root, info.realFileName), {}, info).then((html) => {
                    return write(path.join(path.resolve(config.root, '../dest'), info.realFileName), html, true);
                });
        });
    });
    return promise;
}).then(() => {
    console.log('build successfully!');
}).catch(err => {
    console.log(err);
});
