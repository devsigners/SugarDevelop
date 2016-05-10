'use strict';

const path = require('path');
const Hbs = require('./hbs');
const util = require('./util');


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

const placeholderIndex = '__view_index_file__';
const placeholderIndexRe = /__view_index_file__$/;
const createRenderer = (hbs) => {
    const options = hbs.options;
    // this must be bind to koa instance
    return function(url, locals) {
        locals = locals || {};
        util.merge(locals, this.state, hbs.locals);
        const extname = path.extname(url);
        // remove first char ('/' or '\')
        let name = (extname ? url.slice(0, - extname.length) :
            path.join(url, placeholderIndex)).slice(1);
        const urlInfo = parseUrl(name, options.isProjectGroup);
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
const createPartialRenderer = (hbs) => {
    return function(urlInfo, locals) {
        return hbs.renderPartial(urlInfo, locals).then((partial) => {
            this.body = partial;
        });
    }
};

exports = module.exports = (options) => {
    const hbs = new Hbs(options);
    const render = createRenderer(hbs);
    const renderPartial = createPartialRenderer(hbs);
    return (ctx, next) => {
        ctx.render = render;
        ctx.renderPartial = renderPartial;
        return next();
    };
};

exports.Hbs = Hbs;
exports.createRenderer = createRenderer;
exports.loadConfig = loadConfig;
exports.parseUrl = parseUrl;
