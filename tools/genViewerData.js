'use strict';

const path = require('path');
const debug = require('debug')('tool:viewerdata');
const util = require('./util');
const config = require('../config');

let cfgFiles;

util.list(config.staticRoot, ['**/.config.yml', '!**/node_modules/**/.config.yml']).then((files) => {
    debug('files catched %o', files);
    if (!files || !files.length) {
        process.exit(0);
    };
    cfgFiles = files;
    let promises = files.map(file => {
        return util.read(path.resolve(config.staticRoot, file)).then(util.parseYaml);
    });
    return Promise.all(promises);
}).then((cfgList) => {
    let result = [];
    cfgList.forEach((cfg) => {
        if (cfg.project && !cfg.project.disableComponentViewer) {
            result.push(cfg.project);
        }
    });
    // save to viewer source dir
    return util.write(path.resolve(config.viewer.source, '._pageData.js'),
        `module.exports = ${JSON.stringify(result, null, '\t')};`);
}).then(() => {
    debug('Done!');
}).catch((err) => {
    console.log(err.stack);
});
