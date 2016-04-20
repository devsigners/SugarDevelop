'use strict';

const path = require('path');

const root = __dirname;
const staticRoot = path.join(root, 'front/src');

module.exports = {
    hbsOptions: {
        helperPath: path.join(staticRoot, 'helpers'),
        dataPath: path.join(staticRoot, 'data'),
        viewPath: path.join(staticRoot, 'views'),
        partialPath: path.join(staticRoot, 'views/partials'),
        layoutPath: path.join(staticRoot, 'views/layouts'),
        defaultLayout: 'index',
        extname: '.html',
        templateOptions: {}
    },
    hbsOnerror: (err, ctx, next) => {
        console.log('hbs render error.', err && err.message);
    },
    staticRoot,
    server: {
        host: '0.0.0.0',
        port: 3000
    }
};
