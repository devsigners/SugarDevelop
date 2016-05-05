'use strict';

const path = require('path');
const Handlebars = require('handlebars');

const setting = require('./setting');
const Scanner = require('./scanner.js');
const util = require('./util');
const relativePathRe = new RegExp('^\\.{1,2}');
const sharedPathRe = util.sharedPathRe;
const genPartialInfoComment = require('./partial-extend').genPartialInfoComment;

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
                result: util.mergeFileds(setting.dynamicConfig, options)
            }
        };
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
    resolvePath(name, type, ext, baseUrl) {
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
    _getDynamicPartialName(dynamic, data) {
        return this.handlebars.helpers[dynamic.name](data[dynamic.context]);
    }
    installPartial(name, hash, baseUrl, dynamic) {
        if (dynamic) {
            dynamic.baseUrl = baseUrl;
            dynamic.hash = hash;
            if (this.dynamicPartials) {
                this.dynamicPartials.push(dynamic);
            } else {
                this.dynamicPartials = [dynamic];
            }
            return;
        }
        const url = this.resolvePath(name, 'partial', null, baseUrl);
        return util.read(url)
            .then(data => {
                // check params and dispaly partial info with comment
                const comment = this._genPartialComment(name, url, hash, baseUrl,
                    this.currentState.viewUrl, this.options.root);
                this.registerPartial(name, !comment ? data :
                    (comment.start + data + comment.end));
                return this.compile(data, true, url);
            });
    }
    installHelper(name, baseUrl) {
        try {
            const helpers = require(this.resolvePath(name, 'helper', '.js', baseUrl));
            return this.registerHelper(helpers);
        } catch(e) {
            console.log(e.message);
        }
    }
    loadData(name, baseUrl) {
        const url = this.resolvePath(name, 'data', '.json', baseUrl);
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
        return (this.currentState && this.currentState.config[prop]) || this.options[prop];
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
        const cache = this.cache;
        this.currentState = state;
        this.currentState.viewUrl = url;
        let promises;
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
            promises = [dataPath ? this.loadData(dataPath, url) : null, metadata];
            // always prevent to fixPath of '__default_layout__'
            // and load the file '__default_layout__.extname'
            // just load the compiled cache and prevent possible error
            promises.push(layout === '__default_layout__' ? this.cache['__default_layout__'].compiled :
                this.resolve(this.resolvePath(layout, 'layout')));
            return parsed.content;
        }, url).then((tplFn) => {
            // if no promises, means tplFn is from cache[url].compiled,
            // and cache[url].result must exists,
            // so just use cache and no need to generate again.
            return promises ? Promise.resolve(promises[0]).then((fileData) => {
                // all data merged
                util.merge(data, fileData, promises[1]);
                promises = promises.slice(2);
                // then check if there is any dynamic partials
                if (this.dynamicPartials) {
                    promises = promises.concat(this.dynamicPartials.map((dynamic) => {
                        return this.installPartial(this._getDynamicPartialName(dynamic, data),
                            dynamic.hash, dynamic.baseUrl);
                    }));
                }
                return Promise.all(promises);
            }).then((res) => {
                this.dynamicPartials = null;
                data.body = tplFn(data);
                cache[url].result = res[0](data);
                return cache[url].result;
            }) : cache[url].result;
        });
    }
    /**
     * load content of file and compile it to render function
     * @param  {String} url          full url of file, prefer view/layout
     * @param  {Function} processTpl process the raw tpl and return handled content
     * @return {Promise}             promise
     */
    resolve(url, processTpl) {
        const cache = this.cache;
        if (!this.options.disableCache && cache[url] && cache[url].compiled) {
            return Promise.resolve(cache[url].compiled);
        }
        return util.read(url).then(rawTpl => {
            return this.compile(processTpl ? processTpl(rawTpl) : rawTpl, false, url);
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
                return this.installPartial(v.name, v.hash, curUrl, v.dynamic);
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
