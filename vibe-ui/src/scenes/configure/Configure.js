import React, {Component} from "react";
import Message from "../../components/Message";
import {Col, Container, Row} from "react-bootstrap";
import {connect, PromiseState} from "react-refetch";
import DeviceStatusTable from "./DeviceStatusTable";
import TargetState from "./TargetState";
import {API_PREFIX} from "../../App";

class Configure extends Component {

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
                <Container>
                    <Row>
                        <Col>
                            <DeviceStatusTable deviceState={this.props.deviceState.value}
                                               targetState={this.props.targetState.value}/>
                        </Col>
                    </Row>
                    <Row className={'mt-3'}>
                        <Col>
                            <TargetState targetState={this.props.targetState.value}/>
                        </Col>
                    </Row>
                </Container>
            );
        }
    }
}

export default connect((props) => ({
    deviceState: {url: `${API_PREFIX}/devices`, refreshInterval: 1000},
    targetState: {url: `${API_PREFIX}/state`, refreshInterval: 1000}
}))(Configure)