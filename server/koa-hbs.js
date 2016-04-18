'use strict';

const path = require('path');
const Handlebars = require('handlebars');

const util = require('./util');

class ImportScanner extends Handlebars.Visitor {
    constructor() {
        super();
        this.reset();
    }
    reset() {
        this.partials = [];
        this.helpers = [];
    }
    BlockStatement(block) {
        this.helpers.push({
            name: block.path.original
        });
        super.BlockStatement(block);
    }
    PartialStatement(partial) {
        this.partials.push({
            name: partial.name.original
        });
        super.PartialStatement(partial);
    }
}

class Hbs {
    constructor(opts) {
        let options = this.options = util.merge({}, Hbs.defaults, opts);
        if (!options.viewPath) {
            throw new Error('viewPath is required.');
        }
        this.scanner = new ImportScanner();
        this.handlebars = Handlebars.create();
        this.cache = {
            __default_layout__: {
                compiled: this.handlebars.compile('{{{body}}}')
            }
        };
        options.layoutPath = options.layoutPath || options.viewPath;
        // preinstall preInstalledHelpers
        this.installHelper('preInstalledHelpers');
    }
    parse(input, options) {
        const scanner = this.scanner;
        let ast = this.handlebars.parse(input, options);
        scanner.accept(ast);
        let partials = scanner.partials.filter((v) => {
            return !this.handlebars.partials[v.name];
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
    registerPartialByPath(url) {
        // it's ok if ext is `.*`
        const extReg = new RegExp(this.options.ext + '$', 'i');
        const cache = this.cache;
        return util.list(url, ['**/*' + this.options.ext]).then((files) => {
            return files.map((file) => {
                let name = file.replace(extReg, '');
                return util.read(path.resolve(url, file)).then((data) => {
                    cache[name] = data;
                    this.registerPartial(name, data);
                    return data;
                });
            });
        });
    }
    registerPartial() {
        return this.handlebars.registerPartial.apply(this.handlebars, arguments);
    }
    unregisterPartial(name) {
        return this.handlebars.unregisterPartial(name);
    }
    // lookup view path
    fixPath(name, type, ext) {
        type = type || 'view';
        name = path.extname(name) ? name : (name + (ext || this.options.extname));
        if (path.isAbsolute(name)) {
            return name;
        }
        return path.resolve(this.options[type + 'Path'], name);
    }
    installPartial(name) {
        console.log('partial', name);
        return util.read(this.fixPath(name, 'partial'))
            .then(data => {
                this.registerPartial(name, data);
                const result = this.parse(data);
                let partialsPromise;
                // load unregistered helpers -- sync
                if (result.helpers.length) {
                    result.helpers.forEach((v) => {
                        this.installHelper(v.name);
                    });
                }
                // load unregistered partials -- async
                if (result.partials.length) {
                    partialsPromise = Promise.all(result.partials.map((v) => {
                        return this.installPartial(v.name);
                    }));
                }
                return Promise.resolve(partialsPromise);
            });
    }
    installHelper(name) {
        console.log('helper', name);
        return this.registerHelper(require(this.fixPath(name, 'helper', '.js')));
    }
    loadData(name) {
        const url = this.fixPath(name, 'data', '.json');
        if (!this.options.disableCache && this.cache[url]) {
            return Promise.resolve(this.cache[url]);
        }
        return util.read(url)
            .then(json => {
                this.cache[url] = JSON.parse(json);
                return this.cache[url];
            });
    }
    render(name, data) {
        const path = this.fixPath(name, 'view');
        console.log(path, data);
        const cache = this.cache;
        let promises;
        return this.resolve(path, (rawTpl) => {
            let parsed = util.parseYaml(rawTpl);
            let metadata = parsed.metadata;
            let layout, dataPath;
            if (metadata) {
                layout = metadata.layout;
                dataPath = metadata.data;
            }
            // load layout
            if (layout == null || layout === true) {
                layout = this.options.defaultLayout;
            } else if (!layout || typeof layout !== 'string') {
                layout = '__default_layout__';
            }
            promises = [];
            // always prevent to fixPath of '__default_layout__'
            // and load the file '__default_layout__.extname'
            // just load the compiled cache and prevent possible error
            promises.push(layout === '__default_layout__' ? this.cache['__default_layout__'].compiled :
                this.resolve(this.fixPath(layout, 'layout')));
            promises.push(dataPath ? this.loadData(dataPath) : null);
            promises.push(metadata);
            return parsed.content;
        }).then((tplFn) => {
            return promises ? Promise.all(promises).then((res) => {
                util.merge(data, res[1], res[2]);
                data.body = tplFn(data);
                cache[path].result = res[0](data);
                return cache[path].result;
            }) : cache[path].result;
        });
    }
    resolve(path, processTpl) {
        const cache = this.cache;
        if (!this.options.disableCache && cache[path] && cache[path].compiled) {
            return Promise.resolve(cache[path].compiled);
        }
        return util.read(path).then(rawTpl => {
            return this.compile(processTpl ? processTpl(rawTpl) : rawTpl);
        }).then((res) => {
            cache[path] = {
                compiled: res
            };
            return res;
        });
    }
    // compile raw template
    compile(content) {
        const result = this.parse(content);
        let partialsPromise;
        // load unregistered helpers -- sync
        if (result.helpers.length) {
            result.helpers.forEach((v) => {
                this.installHelper(v.name);
            });
        }
        // load unregistered partials -- async
        if (result.partials.length) {
            partialsPromise = Promise.all(result.partials.map((v) => {
                return this.installPartial(v.name);
            }));
        }
        return Promise.resolve(partialsPromise).then(() => {
            return this.handlebars.compile(result.ast);
        });
    }
}

Hbs.defaults = {
    templateOptions: {},
    // default disable cache, so it will always reload file
    // and thus all change will be present
    disableCache: true,
    extname: '.hbs',
    defaultLayout: 'default'
};

const createRenderer = (hbs) => {
    // assume this is bind to koa instance
    return function(name, locals) {
        const defer = Promise.defer();
        locals = locals || {};
        util.merge(locals, this.state, hbs.locals);
        return hbs.render(name, locals).then((html) => {
            this.body = html;
        }).catch(err => {
            console.log('err', err.stack);
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
