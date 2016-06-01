'use strict';

const path = require('path');
const KoaHbs = require('../server/koa-hbs');
const buildStaticConfig = require('../config').buildStatic;
let config = require('../config').hbs;
const util = require('./util');

const Hbs = KoaHbs.Hbs;
const loadConfig = KoaHbs.loadConfig;
const parseUrl = KoaHbs.parseUrl;
const createRenderer = KoaHbs.createRenderer;

config = util.merge({}, Hbs.defaults, config);

const hbsInstance = new Hbs(config);
hbsInstance._genPartialComment = () => null;
util.list(config.root, [
    '**/*' + config.extname,
    '!' + config.shared + '/**/*' + config.extname,
    '!**/node_modules/**/*' + config.extname
].concat(buildStaticConfig.htmlPattern || [])).then(files => {
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
                    return util.write(path.join(path.resolve(config.root, '../dest'), info.realFileName), html, true);
                });
        });
    });
    return promise;
}).then(() => {
    console.log('build successfully!');
}).catch(err => {
    console.log(err);
});
