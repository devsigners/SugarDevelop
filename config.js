'use strict';

const path = require('path');

const root = __dirname;
const staticRoot = path.join(root, 'front/src');

const hbsOptions = {
    root: staticRoot,
    shared: 'shared',
    // dir name
    helper: 'helpers',
    data: 'data',
    view: '',
    partial: 'partials',
    layout: 'layouts',
    // extra
    isProjectGroup: (topDir, path) => {
        return ['group'].indexOf(topDir) > -1;
    },
    defaultPage: 'index',
    defaultLayout: 'index',
    preInstalledHelper: 'shared:preInstalledHelpers',
    extname: '.html',
    templateOptions: {},
    configFileName: '.config.yml',
    onerror: (err, ctx, next) => {
        console.log('hbs render error: ', err.stack);
    }
};

module.exports = {
    hbs: hbsOptions,
    staticRoot,
    // build static config items
    buildStatic: {
        // include/exclude html pages with file pattern, like `!myTmpProj/**.html`
        htmlPattern: []
    },
    viewer: {
        source: path.join(root, 'front/viewer'),
        dest: path.join(root, 'front/vdest'),
        // prefix used to set res path
        prefix: 'viewer'
    },
    server: {
        host: '0.0.0.0',
        port: 3000
    }
};
