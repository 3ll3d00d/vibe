import React, {Component, PropTypes} from "react";
import {Grid, Navbar, Nav, NavItem, Image, Row, Col} from "react-bootstrap";
import {LinkContainer} from 'react-router-bootstrap';
import logo from "../public/vibe.png";

class App extends Component {
    static childContextTypes = {
        apiPrefix: PropTypes.string.isRequired,
    };

    getChildContext() {
        return {
            apiPrefix: '/api/1'
        }
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
                                        <Image src={logo} rounded alt="Vibe"/>
                                    </Navbar.Brand>
                                    <Navbar.Toggle/>
                                </Navbar.Header>
                                <Navbar.Collapse>
                                    <Nav bsStyle="tabs">
                                        <LinkContainer to="/configure">
                                            <NavItem eventKey={1}>Configure</NavItem>
                                        </LinkContainer>
                                        <LinkContainer to="/measure">
                                            <NavItem eventKey={2}>Measure</NavItem>
                                        </LinkContainer>
                                        <LinkContainer to="/rta">
                                            <NavItem eventKey={3}>RTA</NavItem>
                                        </LinkContainer>
                                        <LinkContainer to="/analyse">
                                            <NavItem eventKey={4}>Analyse</NavItem>
                                        </LinkContainer>
                                    </Nav>
                                </Navbar.Collapse>
                            </Navbar>
                        </Col>
                    </Row>
                    <Row>
                        {this.props.children}
                    </Row>
                </Grid>
            </div>
        );
    }
}

export default App;