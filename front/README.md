### About

`front`被设计为容纳所有前端代码，其中`src`为开发目录，应该还有一个同级`dest`目录来容纳编译后的代码（todo）。

### 1. 静态文件服务根目录

目前，服务器的静态文件服务根目录是`front/src/`，这意味着：

- `/images/*.png`访问的是`images`文件夹下的图片；
- `/styles/*.css`访问的是`styles`文件夹下的样式文件；
- `/scripts/*.js`访问的是`scripts`文件夹下的脚本；
- 根据需要在`front/src`下自建目录，按同样规则即可访问到资源文件。

### 2. 页面放在哪？

服务器总是去`front/src/views`下查找url中的同名文件，即

- `localhost:3000`访问的是`views/index.html`；
- `localhost:3000/nolayout.html`访问的是`views/nolayout.html`；
- `index.html|nolayout.html`这些都是一级页面，按照需要添加`views/*.html`。

**注意：** 之后可能会有调整，尤其需要支持多目录/项目，页面的组织方式可能会有变化。

### 3. handlebars的相关目录

本项目的模板是定制化的`handlebars`，且标准的`handlebars`特性都支持。

- `partials`（增强）即对应`views/partials`文件夹下同名文件；
- `layouts`（增强）即对应`views/layouts`文件夹下同名文件；
- `helpers`（增强）即对应`helpers`文件夹下同名文件；
- `data`（新增）即对应`data`文件夹下同名文件。

`partials|layouts|helpers|data`都是懒加载和安装的，这意味着你可以随时通过在相应目录添加文件来添加相应特性。

比如说，`index.html`依赖`partials:whatever`（模板中有`{{>whatever}}`），那么，添加`views/partials/whatever.html`即可正常渲染`index.html`了。

### 4. beyond handlebars

`server`目录下是服务端代码，比较重要的一块是对`handlebars`的增强。

#### 4.1 页面支持yaml头

```markdown
---
layout: false/true/'index' # 指定模板的布局
data: 'simple' # 指定模拟数据文件的文件名 （/views/data文件夹下）
title: 'test' # yaml头的数据在渲染页面时是可访问的
---
```

#### 4.2 强大的数据支持

如上，yaml头中指定`data`后，会自动加载该数据文件作为渲染所需的数据。

此外，yaml头中的数据在渲染阶段也是可访问的。

#### 4.3 渲染时的依赖分析和加载

- 启动时不会加载任何`partials|layouts|helpers`（preInstalledHelpers例外）。
- 渲染模板时动态分析`partials|layouts|helpers|data`并去加载，安装完成后才渲染该模板。

#### 4.4 更多的helper

出去内置helper外，额外添加了提高效率的一些helper。
