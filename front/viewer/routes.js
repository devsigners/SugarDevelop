import React, { Component, PropTypes } from 'react';
import { Router, Route, IndexRoute } from 'react-router';
import { browserHistory } from 'react-router'

import IndexPage from './pages/index';

class AppRoot extends React.Component {
    constructor(props) {
        super(props);
    };
    static propTypes = {
        children: PropTypes.object
    };

    render() {
        return (
            <div>
                { this.props.children }
            </div>
        );
    }
}

class AppRoutes extends Component {
    static propTypes = {
        state: PropTypes.object
    };

    render() {
        return (
            <Router history={browserHistory}>
                <Route path="/" component={AppRoot}>
                    <IndexRoute component={IndexPage}/>
                    <Route path="*" component={IndexPage} {...this.props.state}/>
                </Route>
            </Router>
        );
    }
}

export default AppRoutes;
