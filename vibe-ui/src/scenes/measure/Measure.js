import React, {Component, PropTypes} from "react";
import Message from "../../components/Message";
import {Col, Grid, Panel, Row} from "react-bootstrap";
import {connect, PromiseState} from "react-refetch";
import MeasurementTable from "./MeasurementTable";
import ScheduleMeasurement from "./ScheduleMeasurement";

class Measure extends Component {
    static contextTypes = {
        apiPrefix: PropTypes.string.isRequired
    };

    render() {
        const {devicesAvailable, measurements} = this.props;
        // compose multiple PromiseStates together to wait on them as a whole
        const allFetches = PromiseState.all([devicesAvailable, measurements]);
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
                                    <ScheduleMeasurement devicesAvailable={this.props.devicesAvailable.value} />
                                    <MeasurementTable measurements={ this.props.measurements.value }/>
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
    devicesAvailable: {
        url: `${context.apiPrefix}/devices`,
        refreshInterval: 1000,
        then: (states) => ({
            value: states.map(ds => ds.state.status).includes('INITIALISED')
        })
    },
    measurements: {url: `${context.apiPrefix}/measurements`, refreshInterval: 1000}
} ))(Measure)