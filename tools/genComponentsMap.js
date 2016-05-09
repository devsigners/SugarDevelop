'use strict';

const path = require('path');
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

util.list(config.staticRoot, ['**/component.json']).then((files) => {
    if (!files || !files.length) {
        console.log('found no components info, will exit');
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
    components.forEach((c, i) => {
        if (!c) return;
        let info = projectDirs[res.files[i]];
        let projectName = info.project;
        c.configFile = res.files[i];
        if (!res[projectName]) {
            res[projectName] = {
                project: projectName,
                __files__: [res.files[i]],
                components: {
                    [info.file]: c
                }
            };
        } else {
            res[projectName].files.push(res.files[i]);
            res[projectName].components[info.file] = c;
        }
    });
    delete res.files;
    let promises = [];
    for (let pro in res) {
        promises.push(util.write(path.resolve(config.staticRoot, pro, 'components.js'),
            generateMapFile(res[pro])));
    }
    return Promise.all(promises);
}).then(() => {
    console.log('successfully gen components map.');
}).catch((err) => {
    console.error(err);
});
