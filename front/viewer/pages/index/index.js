import React, { PropTypes, Component } from 'react';
import {
    setupComponentsViewer,
    genShareUrl,
    onComponentToggle
} from './viewer.js';
// styles
import styles from './style.scss';
// style injected to iframe page
const injectedStyle = require('./inject.scss');

class IndexPage extends Component {
    constructor(props) {
        super(props);
        console.log('constructor', props);
        let url = '';
        // share url
        if (props.location && /^\/s/.test(props.location.pathname)) {
            url = decodeURIComponent(props.location.query.url);
        }
        this.state = {
            pages: [{
                label: '订',
                url: '/viewer/book'
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
        this.setState({
            __components__: setupComponentsViewer(this.refs.iframe, injectedStyle, {
                onHideAll: this._onHideAll.bind(this)
            }, this.props.location)
        });
    }
    _onHideAll() {
        this.setState({
            __components__: this.state.__components__
        });
    }
    _toggleComponent(ev) {
        onComponentToggle(ev.target.checked, this.state.__components__.components[ev.target.value]);
        this.setState({
            __components__: this.state.__components__
        });
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
        let url = genShareUrl(this.state.iframe.src, this.state.__components__.components);
        console.log(url);
        alert(url);
    }
    componentDidMount() {
        this.refs.iframe.onload = () => {
            this._onFrameLoad();
        };
    }
    render() {
        console.log('render');
        const components = this.state.__components__ && this.state.__components__.components;
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
                    <nav className={[styles.nav, styles.popoverParent].join(' ')}>
                        <ul className={[styles.menuContainer, styles.popoverHeader].join(' ')}>
                            <li className={styles.menuItem}>组件Map</li>
                        </ul>
                        <div className={styles.popover}>
                            {
                                components ? Object.keys(components).map((key, i) => {
                                    return (
                                        <label key={i}>
                                            <input type="checkbox" checked={!components[key]._hideAll} value={key} onChange={this._toggleComponent.bind(this)}/>
                                            <span>{components[key].name}</span>
                                        </label>);
                                }) : null
                            }
                        </div>
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
                    style={{width: this.state.iframe.width ? this.state.iframe.width : '100%', height: 'calc(100vh - 36px)'}}
                    ref='iframe'>
                </iframe>
            </div>
        );
    }
}

export default IndexPage;
