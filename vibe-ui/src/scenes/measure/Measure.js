import React, {Component, PropTypes} from "react";
import Message from "../../components/Message";
import {Col, Grid, Panel, Row} from "react-bootstrap";
import {PromiseState} from "react-refetch";
import {connect} from "react-refetch";
import Measurements from "./Measurements";
import ScheduleMeasurement from "./ScheduleMeasurement";

class Measure extends Component {
    static contextTypes = {
        apiPrefix: PropTypes.string.isRequired
    };

    render() {
        const {deviceStatuses, measurements} = this.props;
        // compose multiple PromiseStates together to wait on them as a whole
        const allFetches = PromiseState.all([deviceStatuses, measurements]);
        if (allFetches.pending) {
            return (
                <div>
                    <Message type="info" message="Loading"/>
                </div>
            );
        } else if (allFetches.rejected) {
            return (
                <div>
                    <Message title="Unable to fetch data" type="danger" message={measurements.reason.toString()}/>
                </div>
            );
        } else if (allFetches.fulfilled) {
            return (
                <div>
                    <Grid>
                        <Row>
                            <Col>
                                <Panel header="Measurements" bsStyle="info">
                                    <Row>
                                        <Col md={6}>
                                            <ScheduleMeasurement deviceStatuses={this.props.deviceStatuses.value}/>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <Measurements measurements={ this.props.measurements.value }/>
                                        </Col>
                                    </Row>
                                </Panel>
                            </Col>
                        </Row>
                    </Grid>
                </div>
            );
        }
    }
}
export default connect((props, context) => ( {
    deviceStatuses: {
        url: `${context.apiPrefix}/devices`,
        refreshInterval: 1000,
        then: (states) => ({value: states.map(ds => ds.state.status)})
    },
    measurements: {url: `${context.apiPrefix}/measurements`, refreshInterval: 1000}
} ))(Measure)