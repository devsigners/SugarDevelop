'use strict';

const path = require('path');
const Handlebars = require('handlebars');
const debug = require('debug')('khbs');

const setting = require('./setting');
const Scanner = require('./scanner.js');
const util = require('./util');
const relativePathRe = new RegExp('^\\.{1,2}');
const sharedPathRe = util.sharedPathRe;
const genPartialInfoComment = require('./partial-extend').genPartialInfoComment;

// if is magic url, dont resolve it and load corresponding content from cache directly
const rMagicUrl = /__[^_\s\W]+(_[^_\s\W]+)*__/;

class Hbs {
    constructor(opts) {
        let options = this.options = util.merge({}, Hbs.defaults, opts);
        options.layout = options.layout || options.view;
        this.scanner = new Scanner();
        this.handlebars = Handlebars.create();
        this.cache = {
            __default_layout__: {
                compiled: this.handlebars.compile('{{{body}}}')
            },
            __default_config__: {
                result: util.mergeFields(setting.dynamicConfig, options)
            }
        };
        this.dynamicPartials = [];
        // preinstall preInstalledHelpers
        options.preInstalledHelper && this.installHelper(options.preInstalledHelper);
    }
    parse(input) {
        const scanner = this.scanner;
        const disableCache = this.options.disableCache;
        let ast = this.handlebars.parse(input);
        scanner.accept(ast);
        let partials = scanner.partials.filter((v) => {
            return disableCache || !this.handlebars.partials[v.name];
        });
        let helpers = scanner.helpers.filter((v) => {
            return !this.handlebars.helpers[v.name];
        });
        scanner.reset();
        return {
            ast,
            partials,
            helpers
        };
    }
    registerHelper() {
        return this.handlebars.registerHelper.apply(this.handlebars, arguments);
    }
    unregisterHelper(name) {
        return this.handlebars.unregisterHelper(name);
    }
    registerPartial() {
        return this.handlebars.registerPartial.apply(this.handlebars, arguments);
    }
    unregisterPartial(name) {
        return this.handlebars.unregisterPartial(name);
    }
    readableUrl(url) {
        return url && path.relative(this.options.root, url);
    }
    /**
     * resolve path
     * @param  {String} name    file name, maybe without extname, maybe with dir
     *                          1. if absolute, only check extname (add if needed);
     *                          2. if relative, check ext, and resolve to baseUrl or root+projectName
     *                          3. if default name like `index|book/test`, resolve to baseUrl or root+projectName+typeDir
     *                          4. if magic url, return it immediately.
     * @param  {String} type    partial|layout|data
     * @param  {String} ext     extname, if omitted, use this.options.extname
     * @param  {String} baseUrl base url
     * @return {String}         absolute url
     */
    resolvePath(name, type, ext, baseUrl) {
        if (rMagicUrl.test(name)) return name;
        const isRelative = relativePathRe.test(name);
        // cross os compatiable
        name = path.normalize(name);
        baseUrl = baseUrl && path.normalize(baseUrl);
        // add extname
        name = path.extname(name) ? name : (name + (ext || this.options.extname));
        if (path.isAbsolute(name)) {
            return name;
        }
        let projectName = this.currentState ? this.currentState.projectName : '';
        let result;
        if (isRelative) {
            result = baseUrl ? path.resolve(path.dirname(baseUrl), name) : path.resolve(this.options.root, projectName,
                this.currentState.viewName, name);
        } else {
            let typeDir;
            if (sharedPathRe.test(name)) {
                name = name.slice(7);
                projectName = this.options.shared;
                typeDir = type && this.options[type];
            } else {
                typeDir = type && this.getOption(type);
            }
            result = path.join(this.options.root, projectName,
                typeDir || '', name);
        }
        return result;
    }
    _genPartialComment() {
        return genPartialInfoComment.apply(this, arguments);
    }
    installDynamicPartial(dynamic, hash, baseUrl) {
        debug('installDynamicPartial, dynamic partial info is %o', dynamic);
        return this.installPartial(this.handlebars.helpers[dynamic.name](util.accessDeepProperty(
            this.data, dynamic.context)), hash, baseUrl);
    }
    shouldLoadPartialData(partialUrl) {
        // add a flag to not load data, a way to use exist data
        if (this.options.disableLoadPartialData) return Promise.resolve(null);
        let partialDataUrl = partialUrl.replace(new RegExp(`${path.sep}[^${path.sep}]+\\.\\w+$`), `${path.sep}component.json`);
        debug('shouldLoadPartialData,\n\tpartialUrl is %s,\n\tpartialDataUrl is %s',
            this.readableUrl(partialUrl), this.readableUrl(partialDataUrl));
        return util.exist(partialDataUrl).catch(err => {
            debug('not exist partialDataUrl');
            return null;
        });
    }
    installPartial(name, hash, baseUrl) {
        const url = this.resolvePath(name, 'partial', null, baseUrl);
        debug('installPartial, url is %s', this.readableUrl(url));
        return this.shouldLoadPartialData(url).then(partialDataUrl => {
                if (partialDataUrl) {
                    if (!this.options.disableCache && this.cache[partialDataUrl]) {
                        return this.cache[partialDataUrl];
                    } else {
                        return util.read(partialDataUrl).then(json => {
                            if (json) {
                                let data = JSON.parse(json);
                                this.cache[partialDataUrl] = data;
                                util.merge(this.data, {
                                    [`__c_${data._id || ''}__`]: data
                                });
                                debug('read partialData, %o', data);
                            }
                        });
                    }
                }
            }).then(() => {
                return util.read(url);
            }).then(content => {
                // check params and dispaly partial info with comment
                const comment = this._genPartialComment(name, url, hash, baseUrl,
                    this.currentState.viewUrl, this.options.root);
                this.registerPartial(name, !comment ? content :
                    (comment.start + content + comment.end));
                return this.compile(content, true, url);
            });
    }
    installHelper(name, baseUrl) {
        try {
            const helpers = require(this.resolvePath(name, 'helper', '.js', baseUrl));
            return this.registerHelper(helpers);
        } catch(err) {
            console.log(err.stack);
        }
    }
    loadData(name, baseUrl) {
        const url = this.resolvePath(name, 'data', '.json', baseUrl);
        debug('load data, url is %s', this.readableUrl(url));
        if (!this.options.disableCache && this.cache[url] && this.cache[url].result) {
            return Promise.resolve(this.cache[url].result);
        }
        return util.read(url)
            .then(json => {
                this.cache[url] = {
                    result: JSON.parse(json)
                };
                return this.cache[url].result;
            });
    }
    getOption(prop) {
        return (this.currentState && this.currentState.config && this.currentState.config[prop]) || this.options[prop];
    }
    /**
     * render template combined with data
     * @param  {String} name  name of template, always the file name
     * @param  {Object} data  template data
     * @param  {Object} state current state corresponding to the view url,
     *                        including projectName, isGroup. etc.
     * @return {Promise}     promise
     */
    render(url, data, state) {
        debug('Hbs.render, url is %s,\n\tdata is %o,\n\tstate is %o', this.readableUrl(url), data, state);
        const cache = this.cache;
        this.currentState = state;
        this.currentState.viewUrl = url;
        // let promises;
        let layoutFn;
        // reset this.data, data must be object
        this.data = data;
        return this.resolve(url, (rawTpl) => {
            let parsed = util.parseMixedYaml(rawTpl);
            let metadata = parsed.metadata;
            let layout, dataPath;
            if (metadata) {
                layout = metadata.layout;
                dataPath = metadata.data;
            }
            // load layout
            if (layout == null || layout === true) {
                layout = this.getOption('defaultLayout');
            } else if (!layout || typeof layout !== 'string') {
                layout = '__default_layout__';
            }
            debug('After resolve template, layout url is %s', layout);
            return (dataPath ? this.loadData(dataPath, url) : Promise.resolve(null)).then(fileData => {
                util.merge(data, fileData, metadata);
                // always prevent to fixPath of '__default_layout__' and load the file '__default_layout__.extname'
                // just load the compiled cache and prevent possible error
                return this.resolve(this.resolvePath(layout, 'layout'));
            }).then(fn => {
                layoutFn = fn;
                return parsed.content;
            });
        }).then((tplFn) => {
            return this.genHtml(tplFn, url, data, layoutFn);
        });
    }
    /**
     * generate html with render function and data
     * @param  {Function} tplFn       body render function
     * @param  {String} url           corresponding url, used to get/set cache
     * @param  {Object} data          data
     * @param  {Array} promises       dependency promises list,
     *                                is [data from file, metadata, layout, maybe more]
     * @param  {[Object]} partialData partial data, if partial has component.json
     * @return {Object}               promise with generated html
     */
    genHtml(tplFn, url, data, layoutFn) {
        const cache = this.cache;
        if (!layoutFn) return cache[url].result;

        data.body = tplFn(data);
        return (cache[url].result = layoutFn(data));
    }
    renderComponent(url, data) {
        debug('Hbs.renderComponent,\n\turl is %o,\n\tdata is %o', url, data);
        // reset this.data and simulate render view
        this.data = data;
        let urlInfo = util.parseUrl(url, this.options.isProjectGroup);
        const fakeUrl = path.resolve(this.options.root, urlInfo.projectName, '__fake__.html');
        const mapUrl = path.resolve(this.options.root, urlInfo.projectName, 'components.js');
        let map;
        if (!this.disableCache && this.cache[mapUrl]) {
            map = this.cache[mapUrl];
        } else {
            this.cache[mapUrl] = map = require(mapUrl);
        }
        let componentName = urlInfo.viewName.split(path.sep)[0];
        let stateName = urlInfo.viewName.split(path.sep)[1];
        debug('projectName is %s, componentName is %s, stateName is %s', urlInfo.projectName, componentName, stateName);
        map = map.components[componentName];
        // update currentState manually
        this.currentState = {
            projectName: urlInfo.projectName,
            viewName: '__fake__',
            viewUrl: fakeUrl
        };
        // (container) state file name
        let stateFile = map.type === 'd' ? map.template : map.states[stateName].file;
        // stateFile --> relative url
        let relativeUrl = path.relative(fakeUrl.replace(/__fake__\.html$/, ''), path.resolve(this.options.root,
            map.configFile).replace(/component\.json/, stateFile));
        debug('fakeUrl is %s, mapUrl is %s, relativeUrl is %s', this.readableUrl(fakeUrl),
            this.readableUrl(mapUrl), this.readableUrl(relativeUrl));
        ///
        /// hook _state and _stateFile to preinstall correct dynamic partial
        ///
        let hookData = {
            [`__c_${componentName}__`]: {
                _state: stateName,
                _stateFile: map.states[stateName].file
            }
        };
        // patch hookData and map to this.data here
        util.merge(data, map, hookData);
        // shutdown load partial data
        this.options.disableLoadPartialData = true;
        return this.compile(`{{> ./${relativeUrl} $$info='status=hide'}}`, false, fakeUrl).then(fn => {
            this.cache.__partial_template__ = {
                compiled: fn
            };
            debug('before generate component html, data is %o', data);
            // reopen load partial data
            this.options.disableLoadPartialData = false;
            return this.genHtml(fn, '__partial_template__', data, this.cache.__default_layout__.compiled);
        });
    }
    /**
     * load content of file and compile it to render function
     * @param  {String}   url        full url of file, prefer view/layout
     * @param  {Function} processTpl process the raw tpl and return handled content (promise)
     * @return {Promise}             promise
     */
    resolve(url, processTpl) {
        const cache = this.cache;
        // add special cases
        if (rMagicUrl.test(url)) {
            return cache[url] ? Promise.resolve(cache[url].compiled) :
                Promise.reject(`try to resolve invalid url ${url}`);
        }
        if (!this.options.disableCache && cache[url] && cache[url].compiled) {
            return Promise.resolve(cache[url].compiled);
        }
        return util.read(url).then(rawTpl => {
            return (processTpl ? processTpl(rawTpl) : Promise.resolve(rawTpl)).then(processedTpl => {
                return this.compile(processedTpl, false, url);
            });
        }).then((res) => {
            cache[url] = {
                compiled: res
            };
            return res;
        });
    }
    /**
     * compile raw template to render function
     * @param  {String} content          the content of template
     * @param  {Boolean} onlyResolveDeps only resolve dependencies and dont compile the template,
     *                                   inner usage only.
     * @param  {String} curUrl           the url of content
     * @return {Promise}                 promise
     */
    compile(content, onlyResolveDeps, curUrl) {
        const result = this.parse(content);
        let partialsPromise;
        // load unregistered helpers -- sync
        if (result.helpers.length) {
            result.helpers.forEach((v) => {
                this.installHelper(v.name, curUrl);
            });
        }
        // load unregistered partials -- async
        if (result.partials.length) {
            partialsPromise = Promise.all(result.partials.map((v) => {
                if (v.dynamic) {
                    return this.installDynamicPartial(v.dynamic, v.hash, curUrl);
                }
                return this.installPartial(v.name, v.hash, curUrl);
            }));
        }
        const promise = Promise.resolve(partialsPromise);
        return onlyResolveDeps ? promise : promise.then(() => {
            return this.handlebars.compile(result.ast, this.getOption('templateOptions'));
        });
    }
}

Hbs.defaults = util.merge({}, setting.dynamicConfig, setting.staticConfig);

exports = module.exports = Hbs;
