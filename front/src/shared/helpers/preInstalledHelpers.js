'use strict';

///
/// Note: all helpers here will be preinstalled to hbs instance.
///
/// and why?
/// Becase the normal rule is one helper per file (same name),
/// it's sometimes annoying!
///

const Handlebars = require('handlebars');
const path = require('path');

const helpers = {
    css(context) {
        if (!Array.isArray(context)) {
            context = [context];
        }
        return new Handlebars.SafeString(context.map((item) => {
            return `<link rel="stylesheet" href="${item}">`;
        }).join('\n'));
    },
    js(context) {
        if (!Array.isArray(context)) {
            context = [context];
        }
        return new Handlebars.SafeString(context.map((item) => {
            return `<script src="${item}"></script>`;
        }).join('\n'));
    },
    safeUrl(context) {
        return '' + context;
    },
    relative(context, options) {
        let url = path.normalize(context);
        if (/^\./.test(url)) return url;
        return '.' + path.sep + url;
    }
};

module.exports = helpers;
