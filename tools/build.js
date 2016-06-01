'use strict';

const path = require('path');
const debug = require('debug')('tool:static');
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
const staticResMap = {};

util.list(config.root, [
    '**/*' + config.extname,
    '!' + config.shared + '/**/*' + config.extname,
    '!**/node_modules/**/*' + config.extname
].concat(buildStaticConfig.htmlPattern || [])).then(files => {
    debug('files catched %o', files);
    let localConfigPromises = files.map(file => {
        let info = parseUrl(file, config.isProjectGroup);
        return loadConfig(info.projectName, config, hbsInstance.cache).then(localConfig => {
            info.realFileName = file;
            info.config = localConfig;
            const reLayout = new RegExp('^' + (localConfig.layout || config.layout));
            const rePartial = new RegExp('^' + (localConfig.partial || config.partial));
            if (reLayout.test(info.viewName) || rePartial.test(info.viewName)) {
                debug('file %s will be ignored', file)
                info.invalid = true;
            }
            staticResMap[info.projectName] = {
                layout: localConfig.layout || config.layout,
                partial: localConfig.partial || config.partial
            };
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
                    return util.write(path.join(buildStaticConfig.dest, info.realFileName), html, true);
                });
        });
    });
    return promise;
}).then(() => {
    debug('about to transfer static res files');
    const exclude = [];
    for (let projectName in staticResMap) {
        exclude.push(`!${projectName}/${staticResMap[projectName].layout}/**/*.*`);
        exclude.push(`!${projectName}/${staticResMap[projectName].partial}/**/*.*`);
    }
    return util.list(config.root, [
        '**/*.js', // js
        '**/*.css', // css
        '**/*.{png,jpg,gif,webp}', // img
        '**/*.{svg,eot,ttf,otf,woff}', // font
        '**/*.{mp3,mp4,ogg,wav,aac,webm}', // media
        '!**/node_modules/**/*.*'
    ].concat(exclude)).then((files => {
        debug('files catched %o', files);
        let promises = files.map(file => {
            return util.read(path.resolve(config.root, file)).then(data => {
                return util.write(path.join(buildStaticConfig.dest, file), data, true);
            });
        });
        return Promise.all(promises);
    }))
}).then(() => {
    debug('build successfully!');
}).catch(err => {
    console.log(err);
});
