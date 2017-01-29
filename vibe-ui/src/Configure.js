import React, {Component} from "react";
import MeasurementConfig from "./MeasurementConfig";
import Status from "./Status";
import {Grid, Row, Col} from "react-bootstrap";

// TODO maintain targetstate vals as state and accept updates from the contained table
// TODO on click in SetState post current state back to server
// TODO show last message from the server in the Status

// TODO fetch data when the component mounts & long poll for updates
const ts = {
    fs: 500,
    samplesPerBatch: 125,
    accelerometerSens: 2,
    accelerometerEnabled: true,
    gyroSens: 500,
    gyroEnabled: true
};

const ds = [];
ds.push({
    deviceId: 'swoop',
    lastUpdateTime: new Date(),
    state: {
        name: 'swoop',
        fs: 500,
        samplesPerBatch: 125,
        accelerometerEnabled: true,
        accelerometerSens: 2,
        gyroEnabled: true,
        gyroSens: 500,
        status: 'INITIALIZED',
        failureCode: null
    }
});
ds.push({
    deviceId: 'jazz',
    lastUpdateTime: new Date(),
    state: {
        name: 'jazz',
        fs: 500,
        samplesPerBatch: 125,
        accelerometerEnabled: true,
        accelerometerSens: 2,
        gyroEnabled: true,
        gyroSens: 500,
        status: 'INITIALIZED',
        failureCode: null
    }
});

class Configure extends Component {

    constructor(props) {
        super(props);
        this.state = {
            targetState: ts,
            deviceState: ds
        };
    }

    componentDidMount() {
        // make rest API calls and schedule timer
    }

    componentWillUnmount() {
        // cancel timer
    }

    extractDeviceNames() {
        return this.state.deviceState.map((device) => device.deviceId);
    }

    /**
     * Combines the target state and the device state into a shape that allows a bootstrap table to render it as
     * attribute by device name (where we assume the target state is a type of device). The properties of the
     * target state are used as the canonical list of attributes we want to render.
     * @returns {Array}
     */
    getStateByAttibute() {
        return Reflect.ownKeys(this.state.targetState).map((attr) => {
            let target = {
                attribute: attr,
                target: this.state.targetState[attr]
            };
            let devices = this.state.deviceState.map((device) => {
                return {
                    attribute: attr,
                    [device.deviceId]: device.state[attr]
                }
            });
            return Object.assign(target, ...devices);
        });
    }

    /**
     * Exposes the current health state of each device.
     * @returns {Array}
     */
    getCurrentDeviceState() {
        return this.state.deviceState.map((device) => {
            return {
                deviceName: device.deviceId,
                lastUpdate: device.lastUpdateTime,
                status: device.state.status,
                failureCode: device.state.failureCode
            }
        });
    }

    render() {
        return (
            <div>
                <Grid>
                    <Row>
                        <Col>
                            <Status alert="true" message="woot" deviceState={ this.getCurrentDeviceState() }/>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <MeasurementConfig deviceNames={ this.extractDeviceNames() }
                                               stateByAttribute={ this.getStateByAttibute() }/>
                        </Col>
                    </Row>
                </Grid>
            </div>
        );
    }
}
export default Configure;