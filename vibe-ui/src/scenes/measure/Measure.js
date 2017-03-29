import React, {Component, PropTypes} from "react";
import Message from "../../components/Message";
import {Col, Grid, Panel, Row} from "react-bootstrap";
import {connect, PromiseState} from "react-refetch";
import Measurements from "./Measurements";
import ScheduleMeasurement from "./ScheduleMeasurement";
import TimeSeries from "./TimeSeries";

class Measure extends Component {
    static contextTypes = {
        apiPrefix: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);
        this.showTimeSeries.bind(this);
        this.state = {selectedMeasurement: null};
    }

    showTimeSeries = (measurementId) => {
        this.setState((previousState, props) => {
            props.fetchData(measurementId);
            return {selected: measurementId};
        });
    };

    clearTimeSeries = () => {
        this.setState((previousState, props) => {
            return {selected: null};
        });
    };

    findTimeSeriesData() {
        const mId = this.state.selected;
        if (mId) {
            const dataPromiseKey = Object.keys(this.props).find(p => p === `fetchedData_${mId}`);
            if (dataPromiseKey) {
                return this.props[dataPromiseKey];
            }
        }
        return null;
    }

    renderTimeSeriesIfAny() {
        const dataPromise = this.findTimeSeriesData();
        if (dataPromise) {
            const selected = this.props.measurements.value.find(m => m.id === this.state.selected);
            if (selected) {
                return <TimeSeries fs={selected.measurementParameters.fs}
                                   dataPromise={dataPromise}/>
            }
        }
        return <div/>;
    }

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
            const timeSeries = this.renderTimeSeriesIfAny();
            return (
                <div>
                    <Grid>
                        <Row>
                            <Col>
                                <Panel header="Measurements" bsStyle="info">
                                    <Row>
                                        <Col>
                                            <Measurements measurements={this.props.measurements.value}
                                                          fetcher={this.showTimeSeries}
                                                          clearFunc={this.clearTimeSeries}
                                                          selectedMeasurement={this.state.selected}/>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col md={9}>
                                            {timeSeries}
                                        </Col>
                                        <Col md={3}>
                                            <ScheduleMeasurement deviceStatuses={this.props.deviceStatuses.value}/>
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
    measurements: {url: `${context.apiPrefix}/measurements`, refreshInterval: 1000},
    fetchData: (measurementId) => ({
        [`fetchedData_${measurementId}`]: `${context.apiPrefix}/measurements/${measurementId}/timeseries`
    })
} ))(Measure)