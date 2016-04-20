'use strict';

const path = require('path');

const root = __dirname;

module.exports = {
    hbsOptions: {
        viewPath: path.join(root, 'front/src/views'),
        partialPath: path.join(root, 'front/src/views/partials'),
        layoutPath: path.join(root, 'front/src/views/layouts'),
        helperPath: path.join(root, 'front/src/views/helpers'),
        dataPath: path.join(root, 'front/src/views/data'),
        defaultLayout: 'index',
        extname: '.html',
        templateOptions: {}
    },
    hbsOnerror: (err, ctx, next) => {
        console.log('hbs render error.', err && err.message);
    },
    staticRoot: path.join(root, 'front/src'),
    server: {
        host: '0.0.0.0',
        port: 3000
    }
};
