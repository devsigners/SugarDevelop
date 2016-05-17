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

const readSync = fs.readFileSync;
const writeSync = fs.writeFileSync;

/**
 * exist path or not
 * @param  {String} filename path
 * @return {Object}          promise
 */
const exist = (filename) => {
    return new Promise((resolve, reject) => {
        fs.access(filename, err => err ? reject(err) : resolve(filename));
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
        if (isObject(source[prop]) && isObject(target[prop])) {
            merge(target[prop], source[prop]);
        } else {
            target[prop] = source[prop];
        }
    }
    return target;
};

// only merge property that target has
const mergeFields = function(target, source) {
    if (arguments.length > 2) {
        return merge.apply(undefined,
            [merge(target, source)].concat([].slice.call(arguments, 2)));
    }
    for (let prop in source) {
        if (!(prop in target)) continue;
        if (isObject(source[prop]) && isObject(target[prop])) {
            merge(target[prop], source[prop]);
        } else {
            target[prop] = source[prop];
        }
    }
    return target;
};

// not include function, Date, RegExp and so on
const isObject = (obj) => {
    return Object.prototype.toString.call(obj) === '[object Object]';
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

const genUniqueKey = () => Date.now().toString() + Math.random().toString().slice(-4);

/**
 * access object property via deep propertyName
 * @param  {Object} obj          source object
 * @param  {String} propertyName property name, could be like 'user.name'
 * @return {Any}                 the value
 */
const accessDeepProperty = (obj, propertyName) => {
    let names = propertyName.split('.');
    names.some((p, i) => {
        obj = obj[p];
        if (!(obj instanceof Object)) {
            i < names.length - 1 && (obj = undefined);
            return true;
        }
    });
    return obj;
};

const parseUrl = (url, isProjectGroup) => {
    // it's tricky that the url could be 'dir/name' (default, ctx.path is always '/')
    // or 'dir\\name' because use `path.join` on windows
    let parts = path.normalize(url).split(path.sep);
    // projectName is like: group/project or project
    let projectName;
    if (isProjectGroup(parts[0], url)) {
        projectName = parts.slice(0, 2).join(path.sep);
    }
    return {
        isGroup: !!projectName,
        projectName: projectName || parts[0],
        viewName: parts.slice(projectName ? 2 : 1).join(path.sep)
    };
};

module.exports = {
    merge,
    mergeFields,
    isPlainObject,
    read,
    readSync,
    writeSync,
    exist,
    parseYaml,
    parseMixedYaml,
    parseString,
    sharedPathRe: /^shared:/i,
    genUniqueKey,
    accessDeepProperty,
    parseUrl
};
