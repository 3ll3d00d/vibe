import React, {Component} from "react";
import {Button, Card, Col, Form, Row} from "react-bootstrap";
import {connect} from "react-refetch";
import {API_PREFIX} from "../../App";

class TargetState extends Component {

    state = {
        fs: null,
        samplesPerBatch: null,
        accelerometerEnabled: null,
        accelerometerSens: null,
        gyroEnabled: null,
        gyroSens: null
    };

    // handlers that put the form values into component state
    handleFs = (event) => {
        this.setState({fs: parseInt(event.target.value, 10)});
    };

    handleSamplesPerBatch = (event) => {
        this.setState({samplesPerBatch: parseInt(event.target.value, 10)});
    };

    handleAccelerometerSens = (event) => {
        this.setState({accelerometerSens: parseInt(event.target.value, 10)});
    };

    handleGyroSens = (event) => {
        this.setState({gyroSens: parseInt(event.target.value, 10)});
    };

    // accessor methods that return the value for the attribute from the component state if it exists otherwise yields
    // the value pushed down from the server
    getFs = () => {
        return this.hasFs() ? this.state.fs : this.props.targetState.fs;
    };

    getSamplesPerBatch = () => {
        return this.hasSamplesPerBatch() ? this.state.samplesPerBatch : this.props.targetState.samplesPerBatch;
    };

    getAccelerometerSens = () => {
        return this.hasAccelerometerSens() ? this.state.accelerometerSens : this.props.targetState.accelerometerSens;
    };

    getGyroSens = () => {
        return this.hasGyroSens() ? this.state.gyroSens : this.props.targetState.gyroSens;
    };

    // helper functions that return true if we have this value in component state
    hasFs = () => {
        return this.state && this.state.fs;
    };

    hasSamplesPerBatch = () => {
        return this.state && this.state.samplesPerBatch;
    };

    hasAccelerometerSens = () => {
        return this.state && this.state.accelerometerSens;
    };

    hasGyroSens = () => {
        return this.state && this.state.gyroSens;
    };

    // validation rule
    static isValidFs(fs) {
        return fs > 0 && fs <= 1000;
    }

    // validates the supplied value so we can see whether a value has been entered that differs from that on the server
    // and which has been validated
    getFsValidationState = () => {
        if (this.hasFs()) {
            let fs = this.getFs();
            if (fs !== this.props.targetState.fs) {
                return TargetState.isValidFs(fs);
            } else {
                return null;
            }
        } else {
            return null;
        }
    };

    getBatchValidationState = () => {
        if (this.hasSamplesPerBatch()) {
            let samplesPerBatch = this.getSamplesPerBatch();
            if (samplesPerBatch !== this.props.targetState.samplesPerBatch) {
                if (samplesPerBatch > 0) {
                    return samplesPerBatch < this.getFs();
                } else {
                    return false;
                }
            }
        }
        return null
    };

    handleSubmit = (event) => {
        let targetState = {};
        if (this.hasFs()) targetState.fs = this.getFs();
        if (this.hasSamplesPerBatch()) targetState.samplesPerBatch = this.getSamplesPerBatch();
        if (this.hasAccelerometerSens()) {
            let sens = this.getAccelerometerSens();
            if (sens === -1) {
                targetState.accelerometerEnabled = false;
            } else {
                targetState.accelerometerEnabled = true;
                targetState.accelerometerSens = sens;
            }
        }
        if (this.hasGyroSens()) {
            let sens = this.getGyroSens();
            if (sens === -1) {
                targetState.gyroEnabled = false;
            } else {
                targetState.gyroEnabled = true;
                targetState.gyroSens = sens;
            }
        }
        this.props.postTargetState(targetState);
        event.preventDefault();
    };

    render() {
        let accelOptions = [2, 4, 8, 16];
        let gyroOptions = [250, 500, 1000, 2000];
        if (this.props.postTargetStateResponse !== null) {
            // show some indication that the state has been posted and handle failures
        }
        let serverAccelerometerSens = this.props.targetState.accelerometerEnabled
            ? this.props.targetState.accelerometerSens
            : -1;
        let serverGyroSens = this.props.targetState.gyroEnabled
            ? this.props.targetState.gyroSens
            : -1;
        return (
            <Card>
                <Card.Header as={'h6'} className={'bg-info'}>Target State</Card.Header>
                <form onSubmit={this.handleSubmit}  className={'p-2'}>
                    <Form.Group controlId="foo">
                        <Row>
                            <Col md={6}>
                                <SampleRate fs={this.getFs()}
                                            serverFs={this.props.targetState.fs}
                                            fsHandler={this.handleFs}
                                            fsValidationState={this.getFsValidationState()}
                                            batch={this.getSamplesPerBatch()}
                                            serverBatch={this.props.targetState.samplesPerBatch}
                                            batchHandler={this.handleSamplesPerBatch}
                                            batchValidationState={this.getBatchValidationState()}/>
                            </Col>
                            <Col md={6}>
                                <SensorControl name="Accelerometer Sensitivity"
                                               sens={this.getAccelerometerSens()}
                                               serverSens={serverAccelerometerSens}
                                               options={accelOptions}
                                               sensHandler={this.handleAccelerometerSens}
                                               unit="G"/>
                                <SensorControl name="Gyro Sensitivity"
                                               sens={this.getGyroSens()}
                                               serverSens={serverGyroSens}
                                               options={gyroOptions}
                                               sensHandler={this.handleGyroSens}
                                               unit="Degrees/s"/>
                            </Col>
                        </Row>
                    </Form.Group>
                    <Button type="submit" className={'p-2'}>
                        Update Device
                    </Button>
                </form>
            </Card>
        );
    }
}

class SampleRate extends Component {

    render() {
        let currentFs = "";
        let fsValid = {};
        if (this.props.fsValidationState !== null) {
            currentFs = " - current: " + this.props.serverFs + "Hz";
            fsValid = {isValid: this.props.fsValidationState};
        }
        let currentBatch = "";
        let batchValid = {};
        if (this.props.batchValidationState !== null) {
            currentBatch = " - current: " + this.props.serverBatch;
            batchValid = {isValid: this.props.batchValidationState};
        }
        return (
            <Form.Group>
                <Form.Group controlId="fs">
                    <Form.Label>Sample Rate (Hz) {currentFs}</Form.Label>
                    <Form.Control type="number" min="1" max="1000" step="1" value={this.props.fs}
                                  onChange={this.props.fsHandler}
                                  {...fsValid}/>
                </Form.Group>
                <Form.Group controlId="batch">
                    <Form.Label>Samples per Batch {currentBatch}</Form.Label>
                    <Form.Control type="number" min="1" step="1" value={this.props.batch}
                                  onChange={this.props.batchHandler}
                                  {...batchValid}/>
                </Form.Group>
            </Form.Group>
        );
    }
}

class SensorControl extends Component {
    render() {
        let options = this.props.options.map((option) => {
            return <option key={option} value={option}>{option}</option>
        });
        let extraLabel = "";
        let isValid = {};
        if (this.props.serverSens !== this.props.sens) {
            extraLabel = " - current: ";
            extraLabel += (this.props.serverSens === -1 ? " disabled" : " " + this.props.serverSens);
            isValid = {isValid: this.props.sens !== -1};
        }
        return (
            <Form.Group controlId={this.props.name}>
                <Form.Label>{this.props.name} ({this.props.unit}){extraLabel}</Form.Label>
                <Form.Control as="select"
                              placeholder="select"
                              value={this.props.sens}
                              onChange={this.props.sensHandler}
                              {...isValid}>
                    <option value="-1">Disabled</option>
                    {options}
                </Form.Control>
            </Form.Group>
        );
    }
}

export default connect((props) => ({
    postTargetState: targetState => ({
        postTargetStateResponse: {
            url: `${API_PREFIX}/state`,
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(targetState)
        }
    })
}))(TargetState);