'use strict';

const path = require('path');
const debug = require('debug')('khbs');
const Hbs = require('./hbs');
const util = require('./util');

const loadConfig = (projectName, options, cache) => {
    const url = path.join(options.root, projectName, options.configFileName);
    debug('load config, url is %s', path.join(projectName, options.configFileName));
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

const placeholderIndex = '__view_index_file__';
const placeholderIndexRe = /__view_index_file__$/;
const createRenderer = (hbs) => {
    const options = hbs.options;
    // this must be bind to koa instance
    return function(url, locals) {
        debug('render url is %s, data is %o', url, locals);
        locals = locals || {};
        util.merge(locals, this.state, hbs.locals);
        const extname = path.extname(url);
        // remove first char ('/' or '\')
        let name = (extname ? url.slice(0, - extname.length) :
            path.join(url, placeholderIndex)).slice(1);
        const urlInfo = util.parseUrl(name, options.isProjectGroup);
        if (urlInfo.projectName === placeholderIndex) {
            urlInfo.projectName = '';
            urlInfo.viewName = placeholderIndex;
        }
        return loadConfig(urlInfo.projectName, options, hbs.cache).then((config) => {
            urlInfo.viewName = urlInfo.viewName.replace(placeholderIndexRe,
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
// used to render partial
const createComponenRenderer = (hbs) => {
    return function(url, locals) {
        locals = locals || {};
        url = url.slice(1);
        util.merge(locals, this.state, hbs.locals);
        return hbs.renderComponent(url, locals).then((component) => {
            this.body = component;
        });
    }
};

exports = module.exports = (options) => {
    debug('start, attach render and renderComponent method, options is %o', options);
    const hbs = new Hbs(options);
    const render = createRenderer(hbs);
    const renderComponent = createComponenRenderer(hbs);
    return (ctx, next) => {
        ctx.render = render;
        ctx.renderComponent = renderComponent;
        return next();
    };
};

exports.Hbs = Hbs;
exports.createRenderer = createRenderer;
exports.loadConfig = loadConfig;
exports.parseUrl = util.parseUrl;
