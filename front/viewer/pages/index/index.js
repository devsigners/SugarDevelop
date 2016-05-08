import React, { PropTypes, Component } from 'react';
import $ from 'jquery';
// styles
import styles from './style.scss';
// style injected to iframe page
const injectedStyle = require('./inject.scss');

// get all comments inside the el
const getComments = (el) => {
    let arr = [];
    for(let i = 0; i < el.childNodes.length; i++) {
        let node = el.childNodes[i];
        if(node.nodeType === 8) {
            arr.push(node);
        } else {
            arr.push.apply(arr, getComments(node));
        }
    }
    return arr;
};

// scan comments and parse all components info.
const parseComponents = (comments) => {
    const re = /(\{[^\{\}]+\})/;
    const map = {};
    for(let i = 0; i < comments.length; i += 2) {
        let start = comments[i];
        let end = comments[i + 1];
        if (!end) {
            console.warn('Has broken comment pair.');
            console.log(start, end);
            break;
        }
        let val = re.exec(start.textContent);
        if (!val) {
            console.warn('Has invalid start comment.');
            console.log(start);
            continue;
        }
        try {
            val = JSON.parse(val[1]);
            if (!map[val.name]) {
                map[val.name] = [];
            }
            val.element = start.nextElementSibling;
            map[val.name].push(val);
        } catch(e) {
            console.warn('Start comment\'s component info is invalid JSON.');
            console.log(e.stack);
        }
    }
    return map;
};


const scanComponentInfo = (components) => {
    if (!components || !components.length) return;
    let content = `<label><input type="checkbox" data-is-all="yes" data-index=${-1} value="all" />All</label>`;
    let hasDefaultShow = false;
    let hasPrimaryComponent = false;
    let primaryComponentIndex = -1;
    components.forEach((c, index) => {
        content += `<label><input type="checkbox" ${(index === 0 || c.show) ?
            'checked' : ''} data-index=${index} value=${c.state} />${c.label}</label>`;
        if (c.show) {
            hasDefaultShow = true;
        }
        if (c.isPrimary) {
            hasPrimaryComponent = true;
            primaryComponentIndex = index;
        }
    });
    let name = components[0].name;
    let $boxHead = $(`<div class="inject-box-head" data-name="${name}">${name}</div>`);
    let $boxBody = $(`<div class="inject-box-body">${content}</div>`);
    return {
        $boxHead,
        $boxBody,
        $box: $('<div>').addClass('inject-box').attr('data-count', components.length)
            .attr('data-for', 'component-' + name).append($boxHead).append($boxBody),
        hasDefaultShow,
        hasPrimaryComponent,
        primaryComponentIndex
    };
};
const genToolboxes = (componentsMap, $body) => {
    for (let name in componentsMap) {
        let components = componentsMap[name];
        let { $box, $boxHead, $boxBody,
            hasDefaultShow,
            hasPrimaryComponent,
            primaryComponentIndex } = scanComponentInfo(components);
        if (!hasDefaultShow) {
            if (!hasPrimaryComponent) primaryComponentIndex = 0;
            components[primaryComponentIndex].show = true;
        }
        $body.append($box.hide());
        $boxHead.on('click', () => {
            $boxBody.toggle();
        });
        $box.on('click', 'input', (ev) => {
            let i = +$(ev.target).data('index');
            // 如果只剩一个checkbox，则不可以勾掉
            if (i >= 0 && !ev.target.checked && !$box.find('input').filter((i, el) => el.checked).length) {
                ev.target.checked = true;
                return;
            }
            toggleComponent(ev.target.checked ? 'show' : 'hide', $boxBody.find('input'), i, components);
        }).on('click', (ev) => {
            ev.stopPropagation();
        });
        components.forEach((c, index) => {
            c.$toolbox = $box;
            let $el = $(c.element).addClass('ui-component');
            $el.on('click', (ev) => {
                ev.stopPropagation();
                if (c.isActive) return;
                components.forEach(c => ($(c.element).removeClass('ui-component-selected'), c.isActive = false));
                c.isActive = true;
                $el.addClass('ui-component-selected');
                showToolbox($box, $el, c);
            });
            if (!c.show) {
                setTimeout(() => {
                    $el.hide();
                }, 0);
            }
        });
    }
};

const setToolboxPos = ($toolbox, $component) => {
    let offset = $component.offset();
    let width = $component.width();
    return $toolbox.css({
        left: offset.left + width,
        top: parseInt(offset.top, 10) - 28
    });
};
const showToolbox = ($toolbox, $component, component) => {
    console.log('showToolbox');
    setToolboxPos($toolbox, $component).show()
        .find('.inject-box-head')
        .html(`<span class="component-name">${component.name}</span>：<span class="component-label">${component.label}</span>`);
};
const toggleComponent = (action, $inputs, index, components) => {
    let checked = action === 'show' ? true : false;
    let $normalInputs = $inputs.filter((index) => index > 0);
    if (index === -1) {
        $normalInputs.prop('checked', checked);
        //$(components.map((c) => c.element))[action]();
        components.forEach((c) => {
            $(c.element)[action]();
            c.show = checked;
        });
        if (!checked) {
            $normalInputs.eq(0).prop('checked', true);
            toggleComponent('show', $inputs, 0, components)
        }
    } else {
        if (!$normalInputs.filter((i, el) => el.checked !== checked).length) {
            $inputs.eq(0).prop('checked', checked);
        }
        components[index].show = checked;
        $(components[index].element)[action]();
    }

    var activeComponentIndex = -1;
    components.some((c, i) => {
        if (c.isActive) {
            activeComponentIndex = i;
            return true;
        }
    });
    // 如果隐藏某个状态的组件，且组件不在显示toolbox组件的下方，隐藏toolbox
    if (!checked) {
        if (index === -1) {
            index = 0;
        }
        if (activeComponentIndex > index) {
            console.log('命中', activeComponentIndex);
            components[activeComponentIndex].isActive = false;
            $(components[activeComponentIndex].element).removeClass('ui-component-selected');
            components[activeComponentIndex].$toolbox.hide();
        }
    } else {
        // 否则更新toolbox的位置
        setToolboxPos(components[activeComponentIndex].$toolbox, $(components[activeComponentIndex].element));
    }
}

// url is like: http://0.0.0.0:3100/s?components=passenger,panel&pannel=state1,state2,state3&passenger=language-en,normal&url=http%3A%2F%2Flocalhost%3A3000%2Fbook.html
const parseUrlQuery = ({pathname, query}) => {
    console.log(pathname, query);
    if (pathname !== '/s' || !query.components) return;
    let map = {};
    let components = query.components.split(',');
    components.forEach((c) => {
        if (query[c]) {
            map[c] = query[c].split(',');
        }
    });
    return map;
};

const genShareUrl = (url, componentsMap) => {
    let base = location.origin + '/s?url=' + encodeURIComponent(url);
    let names = [];
    for (let name in componentsMap) {
        names.push(name);
        base += `&${name}=${componentsMap[name].filter((c) => c.show)
            .map((c) => c.state).join(',')}`;
    }
    base += '&components=' + names.join(',');
    return base;
};

class IndexPage extends Component {
    constructor(props) {
        super(props);
        console.log('constructor', props);
        let url = '';
        if (props && props.location) {
            this.componentsMap = parseUrlQuery(props.location);
            // url = props.location.query.url;
            // if (url && !/^\/proxy/.test(url)) {
            //     url = '/proxy?url=' + encodeURIComponent(url);
            // }
        }
        console.log(this.componentsMap, url);
        this.state = {
            pages: [{
                label: '订',
                url: '/book'
            }, {
                label: 'X',
                url: '/book'
            }, {
                label: '其它',
                url: '/book'
            }],
            sizes: [
                {
                    label: 'M',
                    size: 980
                }, {
                    label: 'L',
                    size: 1200
                }, {
                    label: 'Full',
                    size: '100%'
                }
            ],
            iframe: {
                src: url
            }
        };
    };
    _loadPage(url) {
        if (!url) return;
        console.log('loadpage', url);
        this.setState({
            iframe: {
                src: url
            }
        });
    }
    _onFrameLoad() {
        console.log('frame load');
        let win = this.refs.iframe.contentWindow;
        let doc = this.refs.iframe.contentDocument;
        let $body = $(doc.body);
        let $win = $(win);
        $(doc.head).append('<style>' + injectedStyle + '</style>');
        let comments = getComments(doc.body).filter((v) => {
            return /\$component-(start|end)\$/i.test(v.textContent);
        });
        let componentsMap = parseComponents(comments);
        if (this.componentsMap) {
            let map = this.componentsMap;
            for (let name in map) {
                if (componentsMap[name]) {
                    componentsMap[name].forEach((c) => {
                        if (map[name].indexOf(c.state) > -1) {
                            c.show = true;
                        }
                    });
                }
            }
        }
        this._componentsMap = componentsMap;
        console.log(componentsMap);
        $win.on('click', (ev) => {
            $body.find('.inject-box').hide();
            for (let name in componentsMap) {
                componentsMap[name].forEach((c) => {
                    c.isActive = false;
                    $(c.element).removeClass('ui-component-selected');
                });
            }
        });
        genToolboxes(componentsMap, $body);
    }
    _resizeFrame(width, animate) {
        if (typeof width === 'number' && width < 320) width = 320;
        console.log('resize', width);
        this.setState({
            iframe: {
                width,
                animate,
                src: this.state.iframe.src
            }
        });
    }
    _share() {
        let url = genShareUrl(this.state.iframe.src, this._componentsMap);
        console.log(url);
        alert(url);
    }
    componentDidMount() {
        console.log('mount');

        this.refs.iframe.onload = () => {
            console.log('onload');
            this._onFrameLoad();
        };
        $(this.refs.iframe).css({
            width: '100%',
            height: 'calc(100vh - 36px)'
        });
    }
    render() {
        console.log('render');
        return (
            <div>
                <header className={styles.header}>
                    <nav className={styles.nav}>
                        <ul className={styles.menuContainer}>
                            {
                                this.state.pages.map((v, i) => <li className={styles.menuItem} key={i}><span onClick={this._loadPage.bind(this, v.url)}>{v.label}</span></li>)
                            }
                        </ul>
                    </nav>
                    <nav className={styles.nav}>
                        <ul className={styles.menuContainer}>
                            {
                                this.state.sizes.map((v, i) => <li className={styles.menuItem} key={i}><span onClick={this._resizeFrame.bind(this, v.size, true)}>{v.label}</span></li>)
                            }
                        </ul>
                    </nav>
                    <nav className={styles.nav}>
                        <ul className={styles.menuContainer}>
                            <li className={styles.menuItem} onClick={this._share.bind(this)}>share</li>
                        </ul>
                    </nav>
                </header>
                <iframe
                    src={this.state.iframe.src}
                    className={styles.iframe + (this.state.iframe.animate ? ' ' + styles.animateWidth : '')}
                    style={{width: this.state.iframe.width ? this.state.iframe.width : '100%'}}
                    ref='iframe'>
                </iframe>
            </div>
        );
    }
}

export default IndexPage;
