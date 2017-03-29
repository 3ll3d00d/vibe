import React from "react";
import ReactDOM from "react-dom";
import {browserHistory, Route, Router} from "react-router";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/css/bootstrap-theme.css";
import "font-awesome/css/font-awesome.css";
import "./index.css";
import App from "./App";
import Configure from "./scenes/configure/Configure";
import Target from "./scenes/target/Target";
import Measure from "./scenes/measure/Measure";
import Analyse from "./scenes/analyse/Analyse";
import NotFound from "./scenes/404/NotFound";
import "babel-polyfill";
import vibeApp from "./reducers/index";
import {Provider} from "react-redux";
import {createStore} from "redux";

let store = createStore(vibeApp);

ReactDOM.render(
    (
        <Provider store={store}>
            <Router history={browserHistory}>
                <Route path="/" component={App}>
                    <Route path="/configure" component={Configure}/>
                    <Route path="/target" component={Target}/>
                    <Route path="/measure" component={Measure}/>
                    <Route path="/analyse" component={Analyse}>
                        <Route path="/analyse/:measurementId" component={Analyse}>
                            <Route path="/analyse/:measurementId/:deviceId" component={Analyse}>
                                <Route path="/analyse/:measurementId/:deviceId/:analyserId" component={Analyse}>
                                    <Route path="/analyse/:measurementId/:deviceId/:analyserId/:series(/**)"
                                           component={Analyse}/>
                                </Route>
                            </Route>
                        </Route>
                    </Route>
                    {/*<Route path="/rta" component={About}/>*/}
                    <Route path="*" component={NotFound}/>
                </Route>
            </Router>
        </Provider>
    ),
    document.getElementById('root')
);
