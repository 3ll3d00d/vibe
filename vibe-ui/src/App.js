import React, {Component} from "react";
import PropTypes from "prop-types";
import {Grid, Navbar, Nav, NavItem, Image, Row, Col} from "react-bootstrap";
import {Route, Switch} from "react-router";
import {LinkContainer} from 'react-router-bootstrap';
import logo from "./vibe-24x24.png";
import Configure from "./scenes/configure/Configure";
import Upload from "./scenes/upload/Upload";
import Analyse from "./scenes/analyse/Analyse";
import Measure from "./scenes/measure/Measure";
import Target from "./scenes/target/Target";

class App extends Component {
    static childContextTypes = {
        apiPrefix: PropTypes.string.isRequired,
    };

    getChildContext() {
        return {
            apiPrefix: '/api/1'
        };
    }

    render() {
        return (
            <div>
                <Grid>
                    <Row>
                        <Col>
                            <Navbar>
                                <Navbar.Header>
                                    <Navbar.Brand>
                                        <a href="http://vibe.readthedocs.io/en/latest/" target="docs"><Image src={logo} rounded alt="Vibe"/></a>
                                    </Navbar.Brand>
                                    <Navbar.Toggle/>
                                </Navbar.Header>
                                <Navbar.Collapse>
                                    <Nav bsStyle="tabs">
                                        <LinkContainer to="/configure">
                                            <NavItem eventKey={1}>Configure</NavItem>
                                        </LinkContainer>
                                        <LinkContainer to="/target">
                                            <NavItem eventKey={2}>Target</NavItem>
                                        </LinkContainer>
                                        <LinkContainer to="/measure">
                                            <NavItem eventKey={3}>Measure</NavItem>
                                        </LinkContainer>
                                        <LinkContainer to="/analyse">
                                            <NavItem eventKey={4}>Analyse</NavItem>
                                        </LinkContainer>
                                        <LinkContainer to="/upload">
                                            <NavItem eventKey={4}>Upload</NavItem>
                                        </LinkContainer>
                                    </Nav>
                                </Navbar.Collapse>
                            </Navbar>
                        </Col>
                    </Row>
                    <Row>
                        <Switch>
                            <Route path="/configure" component={Configure}/>
                            <Route path="/target" component={Target}/>
                            <Route path="/measure" component={Measure}/>
                            <Route path="/analyse/:splat*)" component={Analyse}/>
                            <Route path="/analyse" component={Analyse}/>
                            <Route path="/upload" component={Upload}/>
                        </Switch>
                    </Row>
                </Grid>
            </div>
        );
    }
}

export default App;