import React, {Component, PropTypes} from "react";
import Message from "./Message";
import {Panel, Grid, Row, Col} from "react-bootstrap";
import {connect} from "react-refetch";
import MeasurementTable from "./MeasurementTable";
import ScheduleMeasurement from "./ScheduleMeasurement";

class Measure extends Component {
    static contextTypes = {
        apiPrefix: PropTypes.string.isRequired
    };

    render() {
        const {measurements} = this.props;
        if (measurements.pending) {
            return (
                <div>
                    <Message type="info" message="Loading"/>
                </div>
            );
        } else if (measurements.rejected) {
            return (
                <div>
                    <Message title="Unable to fetch data" type="danger" message={measurements.reason.toString()}/>
                </div>
            );
        } else if (measurements.fulfilled) {
            return (
                <div>
                    <Grid>
                        <Row>
                            <Col>
                                <Panel header="Measurements" bsStyle="info">
                                    <ScheduleMeasurement/>
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
    measurements: {url: `${context.apiPrefix}/measurements`, refreshInterval: 1000}
} ))(Measure)