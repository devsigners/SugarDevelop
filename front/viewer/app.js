import React from 'react';
import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import AppRoutes from './routes.js';
import './styles/app.scss';

class App {
    render(element) {
        var appRootElement = React.createElement(AppRoutes, {
            state: {}
        });

        if (element) {
            return ReactDOM.render(appRootElement, element);
        }

        return ReactDOMServer.renderToString(appRootElement);
    }

    renderToDOM(element) {
        if (!element) {
            throw new Error('App.renderToDOM: element is required!');
        }
        this.render(element);
    }

    renderToString() {
        return this.render();
    }
}

export default App;


const main = () => {
    const app = new App();

    app.renderToDOM(document.getElementById('app'));
};

main();
