'use strict';

const Handlebars = require('handlebars');
const path = require('path');
const util = require('./util');
// here are some addtional core helpers or helper's helpers.
// so I dont put it in front/src/shared:helpers (helpers there are optional)

module.exports = function initCoreHelpers(hbs) {
    if (!hbs) return;

    // cssx helper, import component style
    hbs.registerHelper('cssx', function(file, options) {
        if (file && this.__css__ && this.__css__.indexOf(file) === -1) {
            this.__css__.push(file);
        }
    });
    // csso helper, output styles imported via cssx
    hbs.registerHelper('csso', function(file) {
        let content = this.__css__.map(v => path.join(hbs.options.root, v))
            .map(v => util.readSync(v));
        file = typeof file === 'string' ? file : '/shared/static/styles/._componentsStyle.css';
        util.writeSync(path.join(hbs.options.root, file), content.join('\n\n'));
        return new Handlebars.SafeString(`<link rel="stylesheet" href="${file}">`);
    });
};
