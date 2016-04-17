'use strict';

const Handlebars = require('handlebars');

// escape map is
// {
//   '&': '&amp;',
//   '<': '&lt;',
//   '>': '&gt;',
//   '"': '&quot;',
//   "'": '&#x27;',
//   '`': '&#x60;',
//   '=': '&#x3D;'
// }

const helpers = {
    code(context, options) {
        if (!options) {
            options = context;
        }
        return Handlebars.Utils.escapeExpression(options.fn());
    }
};

module.exports = helpers;
