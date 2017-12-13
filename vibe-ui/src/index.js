import React from "react";
import ReactDOM from "react-dom";
import {Route, Switch} from "react-router";
import {BrowserRouter} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/css/bootstrap-theme.css";
import "font-awesome/css/font-awesome.css";
import "./index.css";
import App from "./App";
import NotFound from "./scenes/404/NotFound";
import "babel-polyfill";
import vibeApp from "./reducers/index";
import {Provider} from "react-redux";
import {createStore} from "redux";

let store = createStore(vibeApp);

ReactDOM.render(
    (
        <Provider store={store}>
            <BrowserRouter>
                <Switch>
                    <Route path="/" component={App}/>
                    <Route path="*" component={NotFound}/>
                </Switch>
            </BrowserRouter>
        </Provider>
    ),
    document.getElementById('root')
);
