import React from "react";
import ReactDOM from "react-dom";
import {Router, Route, browserHistory} from "react-router";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/css/bootstrap-theme.css";
import "font-awesome/css/font-awesome.css";
import "./index.css";
import App from "./App";
import About from "./About";
import Configure from "./Configure";

ReactDOM.render(
    (
        <Router history={browserHistory}>
            <Route path="/" component={App}>
                <Route path="/configure" component={Configure}/>
                <Route path="/measure" component={About}/>
                <Route path="/analyse" component={About}/>
                <Route path="/rta" component={About}/>
            </Route>
        </Router>
    ),
    document.getElementById('root')
);
