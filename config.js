'use strict';

const path = require('path');

const root = __dirname;
const staticRoot = path.join(root, 'front/src');

module.exports = {
    hbs: {
        root: staticRoot,
        shared: './shared',
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
            console.log('hbs render error: ', err.message);
        }
    },
    staticRoot,
    server: {
        host: '0.0.0.0',
        port: 3000
    }
};
