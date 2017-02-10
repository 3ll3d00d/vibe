import React, {Component} from "react";
import {Row, Col, Button, Well, Form, FormGroup, FormControl, ControlLabel} from "react-bootstrap";
import {connect} from "react-refetch";
import FontAwesome from "react-fontawesome";

class ScheduleMeasurement extends Component {

    constructor(props) {
        super(props);
        this.state = {
            name: null,
            description: null,
            duration: null,
            delay: null
        };
        this.handleName = this.handleName.bind(this);
        this.handleDescription = this.handleDescription.bind(this);
        this.handleDuration = this.handleDuration.bind(this);
        this.handleDelay = this.handleDelay.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

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

    hasDescription() {
        return this.state && this.state.description;
    }

    hasDelay() {
        return this.state && this.state.delay;
    }

    handleSubmit(event) {
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
    }

    render() {
        let submitButton =
            <Button type="submit" onClick={this.handleSubmit}>
                <FontAwesome name="play"/>&nbsp;Go!
            </Button>;
        if (this.props.createMeasurementResponse) {
            if (this.props.createMeasurementResponse.pending) {
                submitButton =
                    <Button type="submit" disabled>
                        <FontAwesome name="spinner" size="2x" spin/>&nbsp;Go!
                    </Button>;
            } else if (this.props.createMeasurementResponse.rejected) {
                submitButton =
                    <Button type="submit" bsStyle="danger" disabled>
                        <FontAwesome name="exclamation" size="2x"/>&nbsp;Error!
                    </Button>;
            }
        }
        return (
            <Well>
                <Form onSubmit={false}>
                    <Row>
                        <Col md={2}>
                            <FormGroup controlId="name">
                                <ControlLabel>Name: </ControlLabel>
                                {' '}
                                <FormControl type="text" onChange={this.handleName}/>
                            </FormGroup>
                        </Col>
                        <Col md={10}>
                            <FormGroup controlId="desc">
                                <ControlLabel>Description: </ControlLabel>
                                {' '}
                                <FormControl componentClass="textarea" onChange={this.handleDescription}/>
                            </FormGroup>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={2}>
                            <FormGroup controlId="duration">
                                <ControlLabel>Duration: </ControlLabel>
                                {' '}
                                <FormControl type="number" min="0.1" step="0.1" placeholder="in seconds"
                                             onChange={this.handleDuration}/>
                            </FormGroup>
                        </Col>
                        <Col md={2}>
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
                            {submitButton}
                        </Col>
                    </Row>
                </Form>
            </Well>
        );
    }
}

export default connect(props => ({
    createMeasurement: measurement => ({
        createMeasurementResponse: {
            url: `/measurements/${measurement.name}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(measurement)
        }
    })
}))(ScheduleMeasurement);