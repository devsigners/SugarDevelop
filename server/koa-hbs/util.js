'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('yamljs');

/**
 * read file content
 * @param  {String} filename file path
 * @param  {Object} options  options
 * @return {Object}          promise
 */
const read = (filename, options) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, options || {
            encoding: 'utf8'
        }, (err, data) => err ? reject(err) : resolve(data));
    });
};

/**
 * exist path or not
 * @param  {String} filename path
 * @return {Object}          promise
 */
const exist = (filename) => {
    return new Promise((resolve, reject) => {
        access(filename, err => err ? reject(err) : resolve());
    });
};

const parseRe = /^\s*\-{3,3}([\S\s]+?)\-{3,3}/i;
const parseYaml = (content) => {
    return yaml.parse(content + '');
};
const parseMixedYaml = (content) => {
    let res = parseRe.exec(content);
    return res ? {
        metadata: parseYaml(res[1]),
        content: content.slice(res[0].length)
    } : {
        content: content
    };
};

const merge = function(target, source) {
    if (arguments.length > 2) {
        return merge.apply(undefined,
            [merge(target, source)].concat([].slice.call(arguments, 2)));
    }
    for (let prop in source) {
        if (isPlainObject(source[prop]) && isPlainObject(target[source])) {
            merge(target[prop], source[prop]);
        } else {
            target[prop] = source[prop];
        }
    }
    return target;
};

// only merge property that target has
const mergeFileds = function(target, source) {
    if (arguments.length > 2) {
        return merge.apply(undefined,
            [merge(target, source)].concat([].slice.call(arguments, 2)));
    }
    for (let prop in source) {
        if (!(prop in target)) continue;
        if (isPlainObject(source[prop]) && isPlainObject(target[source])) {
            merge(target[prop], source[prop]);
        } else {
            target[prop] = source[prop];
        }
    }
    return target;
};

const isPlainObject = (obj) => {
    if (!obj || !Object.prototype.isPrototypeOf(obj)) return false;
    for (let prop in obj) {
        return false;
    }
    return true;
};

// -name|path=full|test=1,2,3
// {
//     name: false,
//     path: 'full',
//     test: [1,2,3]
// }
const parseString = (str) => {
    if (!str) return null;
    const map = {};
    (str + '').split('|').forEach(v => {
        let pairs = v.split('=');
        let res;
        if (pairs.length === 1) {
            res = /^(-|\+?)([\S]+)$/.exec(pairs[0]);
            if (!res) return;
            map[res[2]] = res[1] !== '-';
        } else if (pairs.length === 2) {
            map[pairs[0]] = /,/.test(pairs[1]) ? pairs[1].split(',') : pairs[1];
        }
    });
    return map;
};

module.exports = {
    merge,
    mergeFileds,
    isPlainObject,
    read,
    exist,
    parseYaml,
    parseMixedYaml,
    parseString,
    sharedPathRe: /^shared:/i
};
