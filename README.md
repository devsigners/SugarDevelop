<p align="center"><img width="69" src="https://cloud.githubusercontent.com/assets/8046480/15187341/565c3518-17d3-11e6-8d8e-5ecf132f6681.png"></p>
<h4 align="center">SugarDevelop</h4>

Sugar Develop is a user-friendly static pages develop environment based on `Koa` and `Handlebars`.

[![Dependency Status](https://david-dm.org/creeperyang/SugarDevelop.svg)](https://david-dm.org/creeperyang/SugarDevelop)
[![devDependency Status](https://david-dm.org/creeperyang/SugarDevelop/dev-status.svg)](https://david-dm.org/creeperyang/SugarDevelop#info=devDependencies)

### Targets

- Enhance handlebars template, like PHP/Java template as much as possible.
- Standard workflow, few config, and pure JavaScript env without other dependencies.
- Components develop.

Hope the develop environment will make static page development much easier.

### Features

- Enhanced handlebars template: support yaml header, support data file, support layout specified in template and so on.
- Components.
- Koa server and some useful npm scripts. Such as build totally static html pages from templates, build components map.

### Workflow

The simplest way to run is exec `npm install && npm run build && npm start`, then view `http://0.0.0.0:3000` for your static pages.

Develop dir is `front/src`:

```bash
front/src
    ├── group                  # project group
    │   ├── test               # sub project
    │   │   ├── layouttt       # custom layout
    │   │   ├── myhelper       # custom helper
    │   │   ├── mypartial      # custom partial
    │   │   └── subdir         # normal sub dir
    │   └── test2              # sub project
    ├── index                  # project
    └── shared                 # shared resources
        ├── data               # data
        ├── helpers            # handlebars helpers
        ├── layouts            # handlebars layouts
        ├── partials           # handlebars partials
        │   └── components     # partials/components
        └── static             # static resources
            ├── images
            ├── scripts
            └── styles
```

We only need to

1. mkdir dir at `front/src` as our project root dir.
2. write config file (optional, yaml format).
3. And then write your page with handlebars template or just static html.
4. Wow, just view `http://0.0.0.0:3000/[group/]project/page.html`!

### License

[MIT](https://opensource.org/licenses/mit-license.php)
