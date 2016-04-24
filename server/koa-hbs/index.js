'use strict';

const path = require('path');
const Hbs = require('./hbs');
const util = require('./util');


const parseUrl = (url, isProjectGroup) => {
    let parts = url.split(path.sep);
    let projectName; // group/projectName
    if (isProjectGroup(parts[0], url)) {
        projectName = parts.slice(0, 2).join(path.sep);
    }
    return {
        isGroup: !!projectName,
        projectName: projectName || parts[0],
        viewName: parts.slice(projectName ? 2 : 1).join(path.sep)
    };
};

const loadConfig = (projectName, options, cache) => {
    const url = path.join(options.root, projectName, options.configFileName);
    if (!options.disableCache && cache[url]) {
        return Promise.resolve(cache[url].result || cache[url]);
    }
    return util.read(url)
        .then(yml => {
            cache[url] = {
                result: util.parseYaml(yml)
            };
            return cache[url].result;
        }).catch(err => {
            cache[url] = {
                error: err.message
            };
            return cache[url];
        });
};

const createRenderer = (hbs) => {
    const options = hbs.options;
    // this must be bind to koa instance
    return function(url, locals) {
        locals = locals || {};
        util.merge(locals, this.state, hbs.locals);
        const extname = path.extname(url);
        // first char maybe '/' or '\', just remove it
        let name = (extname ? url.slice(0, - extname.length) :
            path.join(url, '__view_index_file__')).slice(1);;
        const urlInfo = parseUrl(name, options.isProjectGroup);
        return loadConfig(urlInfo.projectName, options, hbs.cache).then((config) => {
            urlInfo.viewName = urlInfo.viewName.replace(/__view_index_file__$/,
                config.defaultPage || options.defaultPage);
            urlInfo.config = config;
            return hbs.render(path.resolve(options.root, urlInfo.projectName,
                urlInfo.viewName + (extname || config.extname || options.extname)),
                locals, urlInfo).then((html) => {
                    this.body = html;
                });
        });
    };
};

exports = module.exports = (options) => {
    const hbs = new Hbs(options);
    const render = createRenderer(hbs);
    return (ctx, next) => {
        ctx.render = render;
        return next();
    };
};

exports.Hbs = Hbs;
