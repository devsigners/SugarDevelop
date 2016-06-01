'use strict';

const path = require('path');
const debug = require('debug')('tool:componentmap');
const util = require('./util');
const config = require('../config');

const res = {};
const projectDirs = {};

const generateMapFile = (map) => {
    let content = JSON.stringify(map, null, '\t');
    return `(function(root, content) {
    if (typeof module === 'object' && module.exports) {
        module.exports = content;
    } else {
        root.__components__ = content;
    }
})(this, ${content})`;
};

util.list(config.staticRoot, ['**/component.json', '!**/node_modules/**/*.*']).then((files) => {
    debug('files catched %o', files);
    if (!files || !files.length) {
        process.exit(0);
    };
    res.files = files;
    let promises = files.map(file => {
        let parts = file.split(path.sep);
        if (config.hbs.isProjectGroup(parts[0], file)) {
            projectDirs[file] = {
                project: parts.slice(0, 2).join(path.sep),
                file: parts.slice(-2)[0]
            };
        } else {
            projectDirs[file] = {
                project: parts[0],
                file: parts.slice(-2)[0]
            };
        }
        return util.read(path.resolve(config.staticRoot, file)).then(content => JSON.parse(content));
    });
    return Promise.all(promises);
}).then(components => {
    let promises = [], writePromise = [];
    components.forEach((c, i) => {
        if (!c) return;
        let info = projectDirs[res.files[i]];
        let projectName = info.project;
        let needToWriteBack = false;
        c.configFile = res.files[i];
        // check c._key
        if (!c._key) {
            c._key = '_component_' + util.genUniqueKey();
            needToWriteBack = true;
        }
        // check c._state (which state is rendered and shown, defaults to `default`)
        if (!c._state) {
            // attention: here we just set `_state` to 'default',
            // if we write `{{> components/name/state}}` in our html,
            // we need set `_state = state` in component.json manually
            c._state = 'default';
            needToWriteBack = true;
        }
        if (!c._stateFile) {
            c._stateFile = c.states[c._state].file;
            needToWriteBack = true;
        }
        if (!c._id) {
            c._id = info.file;
            needToWriteBack = true;
        }
        needToWriteBack && writePromise.push(util.write(path.resolve(config.staticRoot, res.files[i]),
            JSON.stringify(c, null, '\t')));
        if (!res[projectName]) {
            res[projectName] = {
                project: projectName,
                __files__: [res.files[i]],
                components: {
                    [info.file]: c
                },
                // convenient for browser side usage
                keyComponentMap: {
                    [c._key]: info.file
                }
            };
        } else {
            res[projectName].__files__.push(res.files[i]);
            res[projectName].keyComponentMap[c._key] = info.file;
            res[projectName].components[info.file] = c;
        }
    });
    delete res.files;
    for (let pro in res) {
        promises.push(util.write(path.resolve(config.staticRoot, pro, 'components.js'),
            generateMapFile(res[pro])));
    }
    debug('generated map amounts to %d, component.json updated amounts to %d', promises.length, writePromise.length);
    return Promise.all(promises.concat(writePromise));
}).then(() => {
    debug('Done!');
}).catch((err) => {
    console.log(err.stack);
});
