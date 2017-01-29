import React, {Component} from "react";
import {Grid, Navbar, Nav, NavItem, Image, Row, Col} from "react-bootstrap";
import {Link} from "react-router";
import logo from "../public/vibe.png";

class App extends Component {
    render() {
        return (
            <div>
                <Grid>
                    <Row>
                        <Col>
                            <Navbar fixedTop>
                                <Navbar.Header>
                                    <Navbar.Brand>
                                        <Image src={logo} rounded alt="Vibe"/>
                                    </Navbar.Brand>
                                    <Navbar.Toggle/>
                                </Navbar.Header>
                                <Navbar.Collapse>
                                    <Nav bsStyle="tabs">
                                        <NavItem eventKey={1}><Link to="/configure"
                                                                    activeStyle={{color: 'red'}}>Configure</Link></NavItem>
                                        <NavItem eventKey={2}><Link to="/measure"
                                                                    activeStyle={{color: 'red'}}>Measure</Link></NavItem>
                                        <NavItem eventKey={3}><Link to="/analyse"
                                                                    activeStyle={{color: 'red'}}>Analyse</Link></NavItem>
                                        <NavItem eventKey={3}><Link to="/rta"
                                                                    activeStyle={{color: 'red'}}>RTA</Link></NavItem>
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