import React, { PropTypes, Component } from 'react';
import {
    setupComponentsViewer,
    parseUrlQuery,
    genShareUrl
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
        if (props && props.location) {
            this.componentsMap = parseUrlQuery(props.location);
            // url = props.location.query.url;
            // if (url && !/^\/proxy/.test(url)) {
            //     url = '/proxy?url=' + encodeURIComponent(url);
            // }
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
        setupComponentsViewer(this.refs.iframe, injectedStyle);
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
        // $(this.refs.iframe).css({
        //     width: '100%',
        //     height: 'calc(100vh - 36px)'
        // });
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
                    style={{width: this.state.iframe.width ? this.state.iframe.width : '100%', height: 'calc(100vh - 36px)'}}
                    ref='iframe'>
                </iframe>
            </div>
        );
    }
}

export default IndexPage;
