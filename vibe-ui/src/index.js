import React from "react";
import ReactDOM from "react-dom";
import {Router, Route, browserHistory} from "react-router";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/css/bootstrap-theme.css";
import "font-awesome/css/font-awesome.css";
import "./index.css";
import App from "./App";
import Configure from "./scenes/configure/Configure";
import Measure from "./scenes/measure/Measure";
import Analyse from "./scenes/analyse/Analyse";
import NotFound from "./scenes/404/NotFound";
import "babel-polyfill";

ReactDOM.render(
    (
        <Router history={browserHistory}>
            <Route path="/" component={App}>
                <Route path="/configure" component={Configure}/>
                <Route path="/measure" component={Measure}/>
                <Route path="/analyse" component={Analyse}>
                    <Route path="/analyse/:measurementId" component={Analyse}>
                        <Route path="/analyse/:measurementId/:deviceId" component={Analyse}>
                            <Route path="/analyse/:measurementId/:deviceId/:analyserId" component={Analyse}>
                                <Route path="/analyse/:measurementId/:deviceId/:analyserId/:series(/**)" component={Analyse}/>
                            </Route>
                        </Route>
                    </Route>
                </Route>
                {/*<Route path="/rta" component={About}/>*/}
                <Route path="*" component={NotFound} />
            </Route>
        </Router>
    ),
    document.getElementById('root')
);
