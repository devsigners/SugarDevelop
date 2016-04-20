# static-site-env

> 一套基于 Koa + Handlebars 静态页面开发环境.

## 目标与适用

- 在打包工具流行的今天，各种定制化的工作流纷繁复杂。而有时候，标准的，约定的工作流可能更高效。
- Java/PHP模板的渲染往往需要一整套后台软件，对前端（尤其重构）不友好。

本项目即为解决以上痛点设计的一套静态页面开发环境，模板语法尽量通用（符合原后台模板），剥离后台开发环境依赖，页面修改实时刷新和预览。

## 开发流程与目录说明

`npm install && npm start`后即可在`http://0.0.0.0:3000`浏览页面。

开发目录在`front/src`，目录结构如下：

```bash
front/src
├── data                     # 模拟数据，用于模板渲染
├── helpers                  # 扩展 handlebars helper
├── images                   # 图片
├── scripts                  # 脚本
├── styles                   # 样式
└── views                    # 模板（包括partial/layout）
    ├── *.html               # 页面
    ├── layouts              # 布局
    └── partials             # 共用模板片段
        └── components       # 模板片段支持多级目录
```

## 许可

[MIT](https://opensource.org/licenses/mit-license.php)

欢迎提交建议和PR。
