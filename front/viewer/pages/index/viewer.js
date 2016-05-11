import $ from 'jquery';

function iterate(map, cb) {
    for (let prop in map) {
        if (cb(map[prop], prop) === false) break;
    }
}

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

/**
 * generate toolbox
 * @param  {String} key          component's key/name, such as `passenger`
 * @param  {Object} component    component, has multiple states, like {configFile, states, type, template}
 * @param  {Object} [statesInfo] like {state1: true, state2:true},
 *                               if state1 is true, dont make the input checked,
 *                               because it will be handled later
 * @return {Object}              object of {$boxHead, $boxBody, $box}
 */
const genToolbox = (key, component, statesInfo) => {
    if (!component) return;
    console.log('genToolbox', statesInfo);
    statesInfo = statesInfo || {};
    let content = `<label><input type="checkbox" data-is-all="yes" value="all" />All</label>`;
    let count = 0;
    for (let stateName in component.states) {
        let state = component.states[stateName];
        state.displayIndex = count++;
        content += `<label><input type="checkbox" ${(state.$element && !statesInfo[stateName]) ?
            'checked' : ''} data-state=${stateName} data-index=${state.displayIndex} value=${state.name} />${state.name}</label>`;
    }
    let name = component.name;
    let $boxHead = $(`<div class="inject-box-head" data-name="${name}">${name}</div>`);
    let $boxBody = $(`<div class="inject-box-body">${content}</div>`);
    return {
        $boxHead,
        $boxBody,
        $box: $('<div>').addClass('inject-box').attr('data-count', count)
            .attr('data-for', key).append($boxHead).append($boxBody)
    };
};
const setToolboxPos = ($toolbox, $element) => {
    let offset = $element.offset();
    let width = $element.width();
    return $toolbox.css({
        left: offset.left + width,
        top: parseInt(offset.top, 10) - 28
    });
};
const showToolbox = ($toolbox, $element, stateName, componentName) => {
    setToolboxPos($toolbox, $element).show()
        .find('.inject-box-head')
        .html(`<span class="component-name">${componentName}</span>：<span class="component-label">${stateName}</span>`);
};
const setToolboxPosToActiveStateEl = (component) => {
    iterate(component.states, s => {
        if (s.isActive) {
            setToolboxPos(s.$toolbox, s.$element);
            return false;
        }
    });
};
/**
 * handle state element after element inserted
 * @param  {Object} state     state of the component
 * @param  {Object} component the component
 * @return {Object}           the element
 */
const initComponentStateElement = (state, component) => {
    return state.$element.addClass('ui-component').on('click', (ev) => {
        ev.stopPropagation();
        if (state.isActive) {
            return setToolboxPos(state.$toolbox, state.$element);
        }
        iterate(component.states, (state) => (state.isActive = false,
            state.$element && state.$element.removeClass('ui-component-selected')));
        state.isActive = true;
        state.$element.addClass('ui-component-selected');
        showToolbox(state.$toolbox, state.$element, state.name, component.name);
    });
};

const showState = (input, component, projectName) => {
    let stateName = $(input).data('state');
    if (!stateName) {
        // show all
        $(input).parents('.inject-box-body').find('input:not(:checked)').click();
        return;
    }
    const state = component.states[stateName];
    if (state.fileLoaded) {
        state.$element.show();
        setToolboxPosToActiveStateEl(component);
    } else {
        $.ajax({
            url: `/components/${stateName}`,
            data: {
                project: projectName,
                configFile: component.configFile,
                state: stateName
            },
            type: 'GET'
        }).then((partial) => {
            state.fileLoaded = true;
            let $element = $(partial);
            let lastNearbyState;
            // find where to insert
            iterate(component.states, (s) => {
                if (s.$element) {
                    if (s.displayIndex > state.displayIndex) {
                        $element.insertBefore(s.$element);
                        lastNearbyState = null;
                        return false;
                    } else {
                        lastNearbyState = s;
                    }
                }
            });
            if (lastNearbyState) {
                $element.insertAfter(lastNearbyState.$element);
            }
            // partial sometimes include comment, so the $element could be like
            // [comment, text, div.className], so fix it.
            state.$element = $element.length > 1 ? $element.filter((i, el) => el.nodeType === 1) : $element;
            initComponentStateElement(state, component);
            setToolboxPosToActiveStateEl(component);
        });
    }
    state._hide = false;
    let $checkboxes = $(input).parents('.inject-box-body').find('input');
    if (!$checkboxes[0].checked &&
        $checkboxes.slice(1).filter((i, el) => el.checked).length === component._count) {
        $checkboxes[0].checked = true;
    }
};
const hideState = (input, component, onHideAll) => {
    let stateName = $(input).data('state');
    let index = +$(input).data('index');
    if (!stateName) {
        // hide all
        $(input).parents('.inject-box-body').find('input:checked').click();
        component._hideAll = true;
        onHideAll && onHideAll(component);
        return;
    }
    component.states[stateName].$element.hide();
    component.states[stateName]._hide = true;
    // when the state el to hide is in front of the active state el;
    // hide the toolbox
    iterate(component.states, s => {
        if (s.isActive) {
            if (s.displayIndex >= index) {
                s.isActive = false;
                s.$element.removeClass('ui-component-selected');
                s.$toolbox.hide();
            }
            return false;
        }
    });
    // manually set all-checked to false, and this wont trigger change event.
    let $checkboxes = $(input).parents('.inject-box-body').find('input');
    $checkboxes[0].checked = false;
    if (!$checkboxes.filter((i, el) => el.checked).length) {
        component._hideAll = true;
        onHideAll && onHideAll(component);
    }
};

const setupComponentsViewer = (iframe, injectedStyle, hooks, location) => {
    let win = iframe.contentWindow;
    let doc = iframe.contentDocument;
    let $body = $(doc.body);
    let $win = $(win);

    const __components__ = win.__components__;
    if (!__components__) throw new Error('cant find window.__components__');
    let components = __components__.components;

    $(doc.head).append('<style>' + injectedStyle + '</style>');
    getComments(doc.body).forEach((v) => {
        if(/\__component_key__=(\S+)/i.test(v.textContent)) {
            let c = __components__.components[__components__.keyComponentMap[RegExp.$1]];
            c.states[c._state].$element = $(v.nextElementSibling);
        }
    });

    // merge components status from share url
    let shareMap = parseUrlQuery(location);
    console.log('.......', shareMap);

    console.log(__components__);
    for (let name in components) {
        let component = components[name];
        let {
            $box, $boxHead, $boxBody
        } = genToolbox(name, component, shareMap && shareMap[name]);
        $body.append($box.hide());
        $boxHead.on('click', () => {
            $boxBody.toggle();
        });
        $box.on('change', 'input', (ev) => {
            if (ev.target.checked) {
                showState(ev.target, component, __components__.project);
            } else {
                hideState(ev.target, component, hooks && hooks.onHideAll);
            }
        }).on('click', (ev) => {
            ev.stopPropagation();
        });
        let count = 0;
        iterate(component.states, (state, stateName) => {
            state.$toolbox = $box;
            count++;
            state._hide = true;
            if (state.$element) {
                state.fileLoaded = true;
                initComponentStateElement(state, component);
                if (shareMap) {
                    state.$element.hide(); // first hide all states
                } else {
                    state._hide = false;
                }
            }
        });
        if (shareMap) {
            if (!shareMap[name]) {
                component._hideAll = true;
            } else {
                component._hideAll = false;
                $box.find('input').each((i, el) => {
                    let shouldShow = shareMap[name][$(el).data('state')];
                    // show this state
                    if (shouldShow) {
                        $(el).click();
                    }
                });
            }
        }
        component._count = count;
    }
    // hide all toolbox
    $win.on('click', (ev) => {
        $body.find('.inject-box').hide();
        for (let name in components) {
            iterate(components[name].states, (state) => {
                state.isActive = false;
                state.$element && state.$element.removeClass('ui-component-selected');
            });
        }
    });

    return __components__;
};

// url is like: /s?components=passenger,panel&pannel=state1,state2,state3&passenger=language-en,normal&url=http%3A%2F%2Flocalhost%3A3000%2Fbook.html
const parseUrlQuery = ({pathname, query}) => {
    console.log(pathname, query);
    if (!/^\/s/.test(pathname) || query.components == null) return;
    let map = {};
    let components = query.components.split(',');
    components.forEach((c) => {
        if (query[c]) {
            if (!map[c]) map[c] = {};
            query[c].split(',').forEach((s) => {
                map[c][s] = true;
            });
        }
    });
    return map;
};

const genShareUrl = (url, components) => {
    let base = location.origin + '/s?url=' + encodeURIComponent(url);
    let componentNames = [];
    iterate(components, (c, componentName) => {
        if (c._hideAll) return;
        let states = [];
        iterate(c.states, (s, stateName) => {
            console.log(stateName, s);
            if (!s._hide) states.push(stateName);
        });
        componentNames.push(componentName);
        base += `&${componentName}=${states.join(',')}`
    });
    base += '&components=' + componentNames.join(',');
    return base;
};

const onComponentToggle = (show, component) => {
    let state = component.states[component._state];
    if (show) {
        component._hideAll = false;
        // show default
        state.$toolbox.find('input')
            .eq(state.displayIndex + 1).click();
    } else {
        component._hideAll = true;
        // hide all
        let $checkboxes = state.$toolbox.find('input');
        if (!$checkboxes[0].checked) {
            $checkboxes.slice(1).each((i, el) => {
                el.checked && el.click();
            });
        } else {
            $checkboxes.eq(0).click();
        }
    }
};

export {
    getComments,
    setupComponentsViewer,
    parseUrlQuery,
    genShareUrl,
    onComponentToggle
};
