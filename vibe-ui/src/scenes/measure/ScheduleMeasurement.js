import React, {Component, PropTypes} from "react";
import {Button, Col, ControlLabel, Form, FormControl, FormGroup, Modal, Row, Well} from "react-bootstrap";
import {connect} from "react-refetch";
import FontAwesome from "react-fontawesome";

class ScheduleMeasurement extends Component {
    static contextTypes = {
        apiPrefix: PropTypes.string.isRequired
    };

    state = {
        name: null,
        description: null,
        duration: null,
        delay: null,
        showModal: false
    };

    closeModal = () => {
        this.setState({showModal: false});
    };

    openModal = () => {
        this.setState({showModal: true});
    };

    // handlers that put the form values into component state
    handleName = (event) => {
        this.setState({name: event.target.value});
    };

    handleDescription = (event) => {
        this.setState({description: event.target.value});
    };

    handleDuration = (event) => {
        this.setState({duration: parseInt(event.target.value, 10)});
    };

    handleDelay = (event) => {
        this.setState({delay: parseInt(event.target.value, 10)});
    };

    handleSubmit = (event) => {
        let create = {
            name: this.state.name,
            duration: this.state.duration
        };
        if (this.hasDescription()) {
            create.description = this.state.description;
        }
        if (this.hasDelay()) {
            create.delay = this.state.delay;
        }
        this.props.createMeasurement(create);
        event.preventDefault();
    };

    hasDescription() {
        return this.state && this.state.description;
    }

    hasDelay() {
        return this.state && this.state.delay;
    }

    render() {
        let openButton = <Button className="pull-right" bsStyle="danger" disabled>No Devices Available&nbsp;<FontAwesome name="exclamation"/></Button>;
        if (this.props.deviceStatuses.some((status) => status === 'INITIALISED' || status === 'RECORDING')) {
            openButton = <Button className="pull-right" bsStyle="success" onClick={this.openModal}>Schedule Measurement</Button>;
        }
        return (
            <div>
                {openButton}
                <Modal show={this.state.showModal} onHide={this.closeModal}>
                    <Modal.Header>
                        <Modal.Title>Schedule Measurement</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Well>
                            <Form onSubmit={false}>
                                <Row>
                                    <Col md={6}>
                                        <FormGroup controlId="name">
                                            <ControlLabel>Name: </ControlLabel>
                                            {' '}
                                            <FormControl componentClass="textarea" onChange={this.handleName}/>
                                        </FormGroup>
                                    </Col>
                                    <Col md={6}>
                                        <FormGroup controlId="desc">
                                            <ControlLabel>Description: </ControlLabel>
                                            {' '}
                                            <FormControl componentClass="textarea" onChange={this.handleDescription}/>
                                        </FormGroup>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={6}>
                                        <FormGroup controlId="duration">
                                            <ControlLabel>Duration: </ControlLabel>
                                            {' '}
                                            <FormControl type="number" min="0.1" step="0.1" placeholder="in seconds"
                                                         onChange={this.handleDuration}/>
                                        </FormGroup>
                                    </Col>
                                    <Col md={6}>
                                        <FormGroup controlId="delay">
                                            <ControlLabel>Delay: </ControlLabel>
                                            {' '}
                                            <FormControl type="number" min="1" step="1" placeholder="in seconds"
                                                         onChange={this.handleDelay}/>
                                        </FormGroup>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={2}>
                                        {this.getSubmitButton()}
                                    </Col>
                                </Row>
                            </Form>
                        </Well>
                    </Modal.Body>
                </Modal>
            </div>
        );
    }

    getSubmitButton() {
        if (this.props.deviceStatuses.some((status) => status === 'INITIALISED' || status === 'RECORDING')) {
            if (this.props.createMeasurementResponse) {
                if (this.props.createMeasurementResponse.pending) {
                    return (
                        <Button type="submit" disabled>
                            <FontAwesome name="spinner" size="2x" spin/>&nbsp;Go!
                        </Button>
                    );
                } else if (this.props.createMeasurementResponse.rejected) {
                    return (
                        <Button type="submit" bsStyle="danger" disabled>
                            <FontAwesome name="exclamation"/>&nbsp;Error!
                        </Button>
                    );
                }
            }
            return (
                <Button type="submit" onClick={this.handleSubmit}>
                    <FontAwesome name="play"/>&nbsp;Go!
                </Button>
            );
        } else {
            return (
                <Button type="submit" bsStyle="danger" disabled>
                    <FontAwesome name="exclamation"/>&nbsp;No Devices Available!
                </Button>
            );
        }
    }
}

export default connect((props, context) => ({
    createMeasurement: measurement => ({
        createMeasurementResponse: {
            url: `${context.apiPrefix}/measurements/${measurement.name}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(measurement)
        }
    })
}))(ScheduleMeasurement);
