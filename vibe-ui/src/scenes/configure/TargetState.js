import React, {Component, PropTypes} from "react";
import {Button, Col, ControlLabel, FormControl, FormGroup, Panel, Row} from "react-bootstrap";
import {connect} from "react-refetch";

class TargetState extends Component {
    static contextTypes = {
        apiPrefix: PropTypes.string.isRequired
    };

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
    getFs() {
        return this.hasFs() ? this.state.fs : this.props.targetState.fs;
    }

    getSamplesPerBatch() {
        return this.hasSamplesPerBatch() ? this.state.samplesPerBatch : this.props.targetState.samplesPerBatch;
    }

    getAccelerometerSens() {
        return this.hasAccelerometerSens() ? this.state.accelerometerSens : this.props.targetState.accelerometerSens;
    }

    getGyroSens() {
        return this.hasGyroSens() ? this.state.gyroSens : this.props.targetState.gyroSens;
    }

    // helper functions that return true if we have this value in component state
    hasFs() {
        return this.state && this.state.fs;
    }

    hasSamplesPerBatch() {
        return this.state && this.state.samplesPerBatch;
    }

    hasAccelerometerSens() {
        return this.state && this.state.accelerometerSens;
    }

    hasGyroSens() {
        return this.state && this.state.gyroSens;
    }

    // validation rule
    isValidFs(fs) {
        return fs > 0 && fs <= 1000;
    }

    // validates the supplied value so we can see whether a value has been entered that differs from that on the server
    // and which has been validated
    getFsValidationState() {
        if (this.hasFs()) {
            let fs = this.getFs();
            if (fs !== this.props.targetState.fs) {
                return this.isValidFs(fs) ? "success" : "error";
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    getBatchValidationState() {
        if (this.hasSamplesPerBatch()) {
            let samplesPerBatch = this.getSamplesPerBatch();
            if (samplesPerBatch !== this.props.targetState.samplesPerBatch) {
                if (samplesPerBatch > 0) {
                    if (samplesPerBatch < this.getFs()) {
                        return "success";
                    } else {
                        return "warning";
                    }
                } else {
                    return "error";
                }
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

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
            <Panel header="Target State" bsStyle="info">
                <form onSubmit={this.handleSubmit}>
                    <FormGroup controlId="foo">
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
                    </FormGroup>
                    <Button type="submit">
                        Update Device
                    </Button>
                </form>
            </Panel>
        );
    }
}

class SampleRate extends Component {

    render() {
        let currentFs = "";
        if (this.props.fsValidationState !== null) {
            currentFs = " - current: " + this.props.serverFs + "Hz";
        }
        let currentBatch = "";
        if (this.props.batchValidationState !== null) {
            currentBatch = " - current: " + this.props.serverBatch;
        }
        return (
            <FormGroup>
                <FormGroup controlId="fs" validationState={this.props.fsValidationState}>
                    <ControlLabel>Sample Rate (Hz) {currentFs}</ControlLabel>
                    <FormControl type="number" min="1" max="1000" step="1" value={this.props.fs}
                                 onChange={this.props.fsHandler}/>
                </FormGroup>
                <FormGroup controlId="batch" validationState={this.props.batchValidationState}>
                    <ControlLabel>Samples per Batch {currentBatch}</ControlLabel>
                    <FormControl type="number" min="1" step="1" value={this.props.batch}
                                 onChange={this.props.batchHandler}/>
                </FormGroup>
            </FormGroup>
        );
    }
}

class SensorControl extends Component {
    render() {
        let options = this.props.options.map((option) => {
            return <option key={option} value={option}>{option}</option>
        });
        let extraLabel = "";
        let validationState = null;
        if (this.props.serverSens !== this.props.sens) {
            extraLabel = " - current: ";
            extraLabel += (this.props.serverSens === -1 ? " disabled" : " " + this.props.serverSens);
            validationState = this.props.sens === -1 ? "warning" : "success";
        }
        return (
            <FormGroup controlId={this.props.name} validationState={validationState}>
                <ControlLabel>{this.props.name} ({this.props.unit}){extraLabel}</ControlLabel>
                <FormControl componentClass="select"
                             placeholder="select"
                             value={this.props.sens}
                             onChange={this.props.sensHandler}>
                    <option value="-1">Disabled</option>
                    {options}
                </FormControl>
            </FormGroup>
        );
    }
}

export default connect((props, context) => ({
    postTargetState: targetState => ({
        postTargetStateResponse: {
            url: `${context.apiPrefix}/state`,
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(targetState)
        }
    })
}))(TargetState);