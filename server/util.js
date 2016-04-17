'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const glob = require('glob-all');
const yaml = require('yamljs');

/**
 * list files of specific dir
 * @param  {String} root    root dir
 * @param  {Array}  pattern glob pattern, such as 'abc/*.js'
 * @return {Object}         promise
 */
const list = (root, pattern) => {
    return new Promise(function(resolve, reject) {
        glob(pattern, root ? {
            cwd: root
        } : {}, (err, data) =>  err ? reject(err) : resolve(data));
    });
};

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

/**
 * write content to file
 * @param  {String} filename             path
 * @param  {String} content              content
 * @param  {Boolean} createDirIfNotExists create dir if not exists
 * @return {Object}                      promise
 */
// const write = (filename, content, createDirIfNotExists) => {
//     return new Promise((resolve, reject) => {
//         let dir = createDirIfNotExists && filename && path.parse(filename).dir;
//         let promise = createDirIfNotExists ? exist(dir).catch(() => {
//             return mkdir(dir);
//         }) : Promise.resolve(null);
//         promise.then(() => {
//             writeFile(filename, content, {
//                 encoding: 'utf8'
//             }, (err) => err ? reject(err) : resolve());
//         });
//     });
// };

/**
 * create dir
 * @param  {String} dir dir
 * @return {Object}     promise
 */
const mkdir = (dir) => {
    return new Promise((resolve, reject) => {
        mkdirp(dir, (err) => err ? reject(err) : resolve());
    });
};

const getAbsolutePath = (url, root) => {
    return path.isAbsolute(url) ? url : path.resolve(root || process.cwd(), url);
};

const parseRe = /^\s*\-{3,3}([\S\s]+?)\-{3,3}/i;
const parseYaml = (content) => {
    let res = parseRe.exec(content);
    return res ? {
        metadata: yaml.parse(res[1]),
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

const isPlainObject = (obj) => {
    if (!obj || !Object.prototype.isPrototypeOf(obj)) return false;
    for (let prop in obj) {
        return false;
    }
    return true;
};

module.exports = {
    merge,
    isPlainObject,
    list,
    mkdir,
    read,
    exist,
    getAbsolutePath,
    parseYaml
};
