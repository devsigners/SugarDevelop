# static-site-env

> 一套基于 Koa + Handlebars 静态页面开发环境.

## 目标与适用

- 在打包工具流行的今天，各种定制化的工作流纷繁复杂。而有时候，标准的，约定的工作流可能更高效。
- Java/PHP模板的渲染往往需要一整套后台软件，对前端（尤其重构）不友好。

本项目即为解决以上痛点设计的一套静态页面开发环境，模板语法尽量友好，剥离后台开发环境依赖，页面修改可以实时刷新和预览。

## 开发流程与目录说明

`npm install && npm start`后即可在`http://0.0.0.0:3000`浏览页面。

开发目录在`front/src`，目录结构如下：

```bash
front/src
    ├── group                  # 项目组
    │   ├── test               # 项目组/子项目
    │   │   ├── layouttt       # 自定义layout目录
    │   │   ├── myhelper       # 自定义helper目录
    │   │   ├── mypartial      # 自定义partial目录
    │   │   └── subdir         # 子文件夹
    │   └── test2              # 项目组/子项目
    ├── index                  # 子项目
    └── shared                 # 共享目录
        ├── data               # 公用数据目录
        ├── helpers            # 公用helper目录
        ├── layouts            # 公用layout目录
        ├── partials           # 公用partial目录
        │   └── components     # partials/components子目录
        └── static             # 公用静态资源目录
            ├── images
            ├── scripts
            └── styles
```

我们只需要在`front/src`下创建我们自己的项目目录，写配置文件（可选，yaml语法），然后写模板（熟悉的handlebars）即可开发静态页面。在浏览器输入`localhost:3000/[group/]project/page.html`即可访问对应的`front/src/[group/]project/page.html`文件。

## build

`npm run build`命令可以把`front/src`下所有模板编译为纯静态页，编译目录为`front/dest`。

编译后的目录结构保持一致。需要注意，静态资源的`src`没有做任何调整，静态资源也没有copy到dest。所以可能需要配合`gulp`来写一些task使`front/dest`目录可以在浏览器直接预览。

## 许可

[MIT](https://opensource.org/licenses/mit-license.php)

欢迎提交建议和PR。
