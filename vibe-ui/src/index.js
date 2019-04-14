import React from "react";
import ReactDOM from "react-dom";
import {Route, Switch} from "react-router";
import {BrowserRouter as Router} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.css";
import "font-awesome/css/font-awesome.css";
import 'react-table/react-table.css'
import './index.css';
import App from "./App";
import NotFound from "./scenes/404/NotFound";
import "babel-polyfill";

ReactDOM.render(
    (
        <Router>
            <Switch>
                <Route path="/" component={App}/>
                <Route path="*" component={NotFound}/>
            </Switch>
        </Router>
    ),
    document.getElementById('root')
);
