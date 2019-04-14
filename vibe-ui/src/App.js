import React, {Component} from "react";
import {Container, Image, Nav, Navbar} from "react-bootstrap";
import {Route} from "react-router";
import {LinkContainer} from 'react-router-bootstrap';
import logo from "./vibe-24x24.png";
import Configure from "./scenes/configure/Configure";
import Upload from "./scenes/upload/Upload";
import Analyse from "./scenes/analyse/Analyse";
import Measure from "./scenes/measure/Measure";
import Target from "./scenes/target/Target";

export const API_PREFIX = '/api/1';

class App extends Component {

    render() {
        return (
            <Container fluid>
                <Navbar>
                    <Navbar.Brand>
                        <a href="http://vibe.readthedocs.io/en/latest/" target="docs">
                            <Image src={logo} rounded alt="Vibe"/>
                        </a>
                    </Navbar.Brand>
                    <Navbar.Toggle/>
                    <Navbar.Collapse>
                        <Nav variant="tabs">
                            <LinkContainer to="/configure">
                                <Nav.Link eventKey={1}>Configure</Nav.Link>
                            </LinkContainer>
                            <LinkContainer to="/target">
                                <Nav.Link eventKey={2}>Target</Nav.Link>
                            </LinkContainer>
                            <LinkContainer to="/measure">
                                <Nav.Link eventKey={3}>Measure</Nav.Link>
                            </LinkContainer>
                            <LinkContainer to="/analyse">
                                <Nav.Link eventKey={4}>Analyse</Nav.Link>
                            </LinkContainer>
                            <LinkContainer to="/upload">
                                <Nav.Link eventKey={5}>Upload</Nav.Link>
                            </LinkContainer>
                        </Nav>
                    </Navbar.Collapse>
                </Navbar>
                <Route path="/configure" component={Configure}/>
                <Route path="/target" component={Target}/>
                <Route path="/measure" component={Measure}/>
                <Route path="/analyse/:splat*" component={Analyse}/>
                <Route path="/upload" component={Upload}/>
            </Container>
        );
    }
}

export default App;