import React, {Component} from "react";
import MeasurementConfig from "./MeasurementConfig";
import Status from "./Status";
import {Grid, Row, Col} from "react-bootstrap";
import {connect, PromiseState} from "react-refetch";

// TODO maintain targetstate vals as state and accept updates from the contained table
// TODO on click in SetState post current state back to server
// TODO show last message from the server in the Status

class Configure extends Component {

    extractDeviceNames() {
        return this.props.deviceState.map((device) => device.deviceId);
    }

    /**
     * Combines the target state and the device state into a shape that allows a bootstrap table to render it as
     * attribute by device name (where we assume the target state is a type of device). The properties of the
     * target state are used as the canonical list of attributes we want to render.
     * @returns {Array}
     */
    getStateByAttribute() {
        return Reflect.ownKeys(this.props.targetState).map((attr) => {
            let target = {attribute: attr, target: this.props.targetState[attr]};
            let devices = this.props.deviceState.map((device) => {
                return {[device.deviceId]: device.state[attr]}
            });
            return Object.assign(target, ...devices);
        });
    }

    /**
     * Exposes the current health state of each device.
     * @returns {Array}
     */
    getCurrentDeviceState() {
        return this.props.deviceState.map((device) => {
            return {
                deviceName: device.deviceId,
                lastUpdate: device.lastUpdateTime,
                status: device.state.status,
                failureCode: device.state.failureCode
            }
        });
    }

    render() {
        const {deviceState, targetState} = this.props;
        // compose multiple PromiseStates together to wait on them as a whole
        const allFetches = PromiseState.all([deviceState, targetState]);
        if (allFetches.pending) {
            return (
                <div>
                    <Status alert="false" message="Loading"/>
                </div>
            );
        } else if (allFetches.rejected) {
            return (
                <div>
                    <Status alert="true" message={ allFetches.reason }/>
                </div>
            );
        } else if (allFetches.fulfilled) {
            return (
                <div>
                    <Grid>
                        <Row>
                            <Col>
                                <Status alert="false" deviceState={ this.getCurrentDeviceState() }/>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <MeasurementConfig deviceNames={ this.extractDeviceNames() }
                                                   stateByAttribute={ this.getStateByAttribute() }/>
                            </Col>
                        </Row>
                    </Grid>
                </div>
            );
        }
    }
}
export default connect(props => ( {deviceState: `/devices`, targetState: `/state`} ))(Configure)