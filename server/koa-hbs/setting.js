'use strict';

const staticConfig = {
    disableCache: true,
    root: process.cwd(),
    shared: './shared',
    extname: '.html',
    isProjectGroup: (topDir, path) => {
        return ['group'].indexOf(topDir) > -1;
    },
    preInstalledHelper: 'shared:preInstalledHelpers',
    configFileName: '.config.yml',
    onerror: (err, ctx, next) => {
        console.log('hbs render error: ', err.message);
    }
};

const dynamicConfig = {
    // dir name
    helper: 'helpers',
    data: 'data',
    view: '',
    partial: 'partials',
    layout: 'layouts',
    // extra
    defaultPage: 'index',
    defaultLayout: 'index',
    templateOptions: {}
};

module.exports = {
    staticConfig,
    dynamicConfig
};
