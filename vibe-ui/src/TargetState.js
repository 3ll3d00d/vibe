import React, {Component} from "react";
import {Panel, Button, ControlLabel, FormGroup, FormControl} from "react-bootstrap";
import {connect, PromiseState} from "react-refetch";

class TargetState extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fs: null,
            samplesPerBatch: null,
            accelerometerEnabled: null,
            accelerometerSens: null,
            gyroEnabled: null,
            gyroSens: null
        };
        this.handleFs = this.handleFs.bind(this);
        this.handleSamplesPerBatch = this.handleSamplesPerBatch.bind(this);
        this.handleAccelerometerSens = this.handleAccelerometerSens.bind(this);
        this.handleGyroSens = this.handleGyroSens.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleFs = (event) => {
        this.setState({fs: event.target.value});
    };

    handleSamplesPerBatch = (event) => {
        this.setState({samplesPerBatch: event.target.value});
    };

    handleAccelerometerSens = (event) => {
        this.setState({accelerometerSens: event.target.value});
    };

    handleGyroSens = (event) => {
        this.setState({gyroSens: event.target.value});
    };

    getFs() {
        return this.hasFs() ? this.state.fs : this.props.targetState.fs;
    }

    hasFs() {
        return this.state && this.state.fs;
    }

    getSamplesPerBatch() {
        return this.hasSamplesPerBatch() ? this.state.samplesPerBatch : this.props.targetState.samplesPerBatch;
    }

    hasSamplesPerBatch() {
        return this.state && this.state.samplesPerBatch;
    }

    getAccelerometerSens() {
        return this.hasAccelerometerSens() ? this.state.accelerometerSens : this.props.targetState.accelerometerSens;
    }

    hasAccelerometerSens() {
        return this.state && this.state.accelerometerSens;
    }

    getGyroSens() {
        return this.hasGyroSens() ? this.state.gyroSens : this.props.targetState.gyroSens;
    }

    hasGyroSens() {
        return this.state && this.state.gyroSens;
    }

    handleSubmit(event) {
        let targetState = {};
        if (this.hasFs()) targetState.fs = this.getFs();
        if (this.hasSamplesPerBatch()) targetState.samplesPerBatch = this.getSamplesPerBatch();
        if (this.hasAccelerometerSens()) {
            let sens = this.getAccelerometerSens();
            if (sens === "0") {
                targetState.accelerometerEnabled = false;
            } else {
                targetState.accelerometerEnabled = true;
                targetState.accelerometerSens = sens;
            }
        }
        if (this.hasGyroSens()) {
            let sens = this.getGyroSens();
            if (sens === "0") {
                targetState.gyroEnabled = false;
            } else {
                targetState.gyroEnabled = true;
                targetState.gyroSens = sens;
            }
        }
        this.props.postTargetState(targetState);
        event.preventDefault();
    }

    render() {
        let accelOptions = [2, 4, 8, 16];
        let gyroOptions = [250, 500, 1000, 2000];
        if (this.props.postTargetStateResponse) {
            // TODO add spinner to show we are awaiting the response
        }
        return (
            <Panel header="Target State" bsStyle="info">
                <form onSubmit={this.handleSubmit}>
                    <FormGroup controlId="foo">
                        <SampleRate fs={this.getFs()}
                                    batch={this.getSamplesPerBatch()}
                                    fsHandler={this.handleFs}
                                    batchHandler={this.handleSamplesPerBatch}/>
                        <SensorControl name="Accelerometer Sensitivity"
                                       sens={this.getAccelerometerSens()}
                                       options={accelOptions}
                                       sensHandler={this.handleAccelerometerSens}
                                       unit="G"/>
                        <SensorControl name="Gyro Sensitivity"
                                       sens={this.getGyroSens()}
                                       options={gyroOptions}
                                       sensHandler={this.handleGyroSens}
                                       unit="Degrees/s"/>
                    </FormGroup>
                    <Button type="submit">
                        Update Device State
                    </Button>
                </form>
            </Panel>
        );
    }
}

class SampleRate extends Component {

    render() {
        return (
            <FormGroup>
                <FormGroup controlId="fs">
                    <ControlLabel>Sample Rate (Hz)</ControlLabel>
                    <FormControl componentClass="input" value={this.props.fs} onChange={this.props.fsHandler}/>
                </FormGroup>
                <FormGroup controlId="batch">
                    <ControlLabel>Samples per Batch</ControlLabel>
                    <FormControl componentClass="input" value={this.props.batch} onChange={this.props.batchHandler}/>
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
        return (
            <FormGroup controlId={this.props.name}>
                <ControlLabel>{this.props.name} ({this.props.unit})</ControlLabel>
                <FormControl componentClass="select"
                             placeholder="select"
                             value={this.props.sens}
                             onChange={this.props.sensHandler}>
                    <option value="0">Disabled</option>
                    {options}
                </FormControl>
            </FormGroup>
        );
    }
}

export default connect(props => ({
    postTargetState: targetState => ({
        postTargetStateResponse: {
            url: `/state`,
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(targetState)
        }
    })
}))(TargetState);