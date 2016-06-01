import React from 'react';
import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import AppRoutes from './routes.js';
import pageData from './._pageData.js';
import './styles/app.scss';

class App {
    render(element) {
        var appRootElement = React.createElement(AppRoutes, {
            state: {
                pages: pageData.map(d => {
                    d.url = '/viewer/' + d.name;
                    return d;
                }),
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
                ]
            }
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
