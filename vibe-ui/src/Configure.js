import React, {Component, PropTypes} from "react";
import Message from "./Message";
import {Grid, Row, Col} from "react-bootstrap";
import {connect, PromiseState} from "react-refetch";
import DeviceStatusTable from "./DeviceStatusTable";
import TargetState from "./TargetState";

class Configure extends Component {
    static contextTypes = {
        apiPrefix: PropTypes.string.isRequired
    };

    render() {
        const {deviceState, targetState} = this.props;
        // compose multiple PromiseStates together to wait on them as a whole
        const allFetches = PromiseState.all([deviceState, targetState]);
        if (allFetches.pending) {
            return (
                <div>
                    <Message type="info" message="Loading"/>
                </div>
            );
        } else if (allFetches.rejected) {
            return (
                <div>
                    <Message title="Unable to fetch data" type="danger" message={allFetches.reason.toString()}/>
                </div>
            );
        } else if (allFetches.fulfilled) {
            return (
                <div>
                    <Grid>
                        <Row>
                            <Col>
                                <DeviceStatusTable deviceState={ this.props.deviceState.value }
                                                   targetState={ this.props.targetState.value }/>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <TargetState targetState={ this.props.targetState.value }/>
                            </Col>
                        </Row>
                    </Grid>
                </div>
            );
        }
    }
}
export default connect((props, context) => ( {
    deviceState: {url: `${context.apiPrefix}/devices`, refreshInterval: 1000},
    targetState: {url: `${context.apiPrefix}/state`, refreshInterval: 1000}
} ))(Configure)