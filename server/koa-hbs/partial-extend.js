'use strict';

const path = require('path');
const util = require('./util');

const infoOptions = {
    path: 'relativeToRoot', // 'absolute'|'relative'|'relativeToRoot'|false
    status: 'hide', // 'show'|'hide'
    invoke: true // true|false
};

/**
 * generate comment for partial, include partial name/url/invoker
 * @param  {String} name      partial name
 * @param  {String} url       partial full path
 * @param  {String} hash      config
 * @param  {String} invokedBy who invoke the partial
 * @param  {String} viewUrl   the view full path
 * @param  {String} root      the root dir of subproject
 *
 * @return {Object}           start comment and end comment
 */
const genPartialInfoComment = (name, url, hash, invokedBy, viewUrl, root) => {
    const options = util.merge({}, infoOptions);
    if (hash && hash.length) {
        hash.some(v => {
            if (v.key === '$$info') {
                let val = util.parseString(v.value.value);
                util.merge(options, val);
                return true;
            }
        });
    }
    if (options.status === 'hide') {
        return null;
    }
    return {
        start: `<!-- partialBegin(${name}) ${
            !options.path ? '' : getUrl(options.path)
        } ${
            options.invoke ? 'invokedBy(' + path.relative(root, invokedBy)
                + ')' : ''
        }-->\n`,
        end: `\n<!-- partialEnd(${name}) -->\n`
    };

    function getUrl(type) {
        let ret;
        switch (type) {
            case 'absolute':
                ret = url;
                break;
            case 'relative':
                ret = path.relative(viewUrl, url);
                break;
            case 'relativeToRoot':
                ret = path.relative(root, url);
                break;
            default:
                ret = url;
        }
        return ret;
    }
};

module.exports = {
    genPartialInfoComment
};
