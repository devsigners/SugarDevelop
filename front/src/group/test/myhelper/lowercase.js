'use strict';

const Handlebars = require('handlebars');

const helpers = {
    lowercase(context) {
        return new Handlebars.SafeString((context + '').toLowerCase());
    }
};

module.exports = helpers;
