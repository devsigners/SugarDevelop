### About

`front`被设计为容纳所有前端代码，其中`src`为开发目录，应该还有一个同级`dest`目录来容纳编译后的代码（todo）。

### 1. 静态文件服务根目录

目前，服务器的静态文件服务根目录是`front/src/`，这意味着：

- `/shared/static/images/*.png`访问的是`shared/static/images`文件夹下的图片；
- `/shared/static/styles/*.css`访问的是`shared/static/styles`文件夹下的样式文件；
- `/shared/static/scripts/*.js`访问的是`shared/static/scripts`文件夹下的脚本；
- 根据需要在`front/src`下自建项目目录，按同样规则即可访问到资源文件。

### 2. 页面放在哪？

服务器总是去`front/src/`下查找url中的同名文件，即

- `localhost:3000/[group/]project/`访问的是`[group/]project/index.html`；
- `localhost:3000/[group/]project/nolayout.html`访问的是`[group/]project/nolayout.html`。

group是可选的项目组，用于归类子项目。

**注意：** 项目组的支持需要在配置文件中设置。

### 3. handlebars的相关目录

本项目的模板是定制化的`handlebars`，且标准的`handlebars`特性都支持。

`shared`是公用部分：

- `shared:partials`对应`/shared/partials`文件夹下同名文件；
- `shared:layouts`对应`/shared/layouts`文件夹下同名文件；
- `shared:helpers`对应`/shared/helpers`文件夹下同名文件；
- `shared:data`（新增特性）对应`/shared/data`文件夹下同名文件。

同理，每个项目可以有自己的`partials|layouts|helpers|data`，而这些分别对应项目内的哪些文件夹可以通过配置文件来设定，当然，也可以用默认设置。

默认配置是：

```yaml
helper: 'helpers',
data: 'data',
view: '',
partial: 'partials',
layout: 'layouts',
```

`partials|layouts|helpers|data`都是懒加载和安装的，这意味着你可以**随时**通过在相应目录添加文件来添加相应特性。

### 4. beyond handlebars

`server`目录下是服务端代码，比较重要的一块是对`handlebars`的增强。

#### 4.1 页面支持yaml头

```markdown
---
layout: false/true/'index'/'shared:index' # 指定模板的布局
data: 'simple'/'shared:simple' # 指定模拟数据文件的文件名 （/views/data文件夹下）
title: 'test'   # yaml头的数据在渲染页面时是可访问的
---
```

注意，对于`layout|data`而言，加文件名后缀也是可以的，但推荐省略即可。

#### 4.2 强大的数据支持

如上，yaml头中指定`data`后，会自动加载该数据文件作为渲染所需的数据。

此外，yaml头中的数据在渲染阶段也是可访问的。

#### 4.3 渲染时的依赖分析和加载

- 启动时不会加载任何`partials|layouts|helpers`（preInstalledHelpers例外）。
- 渲染模板时动态分析`partials|layouts|helpers|data`并去加载，安装完成后才渲染该模板。

#### 4.4 更多的helper

出去内置helper外，额外添加了提高效率的一些helper。由于是基于JS的（相比PHP/Java），使用者可以自己编写更多的helper辅助开发。
