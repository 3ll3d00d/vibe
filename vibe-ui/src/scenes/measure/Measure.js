import React, {Component} from "react";
import Message from "../../components/Message";
import {Card, Col, Row} from "react-bootstrap";
import {connect, PromiseState} from "react-refetch";
import Measurements from "./Measurements";
import ScheduleMeasurement from "./ScheduleMeasurement";
import TimeSeries from "./TimeSeries";
import EditMeasurement from "./EditMeasurement";
import {API_PREFIX} from "../../App";

class Measure extends Component {
    state = {
        selectedChart: null,
        selectedEdit: null
    };

    showTimeSeries = (measurementId) => {
        this.setState((previousState, props) => {
            props.fetchMeasurementData(measurementId);
            return {selectedChart: measurementId};
        });
    };

    showEdit = (measurementId) => {
        this.setState((previousState, props) => {
            return {selectedEdit: measurementId};
        });
    };

    clearEdit = () => {
        this.setState((previousState, props) => {
            return {selectedEdit: null};
        });
    };

    clearTimeSeries = () => {
        this.setState((previousState, props) => {
            return {selectedChart: null};
        });
    };

    findTimeSeriesData() {
        const mId = this.state.selectedChart;
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
            const selected = this.props.measurements.value.find(m => m.id === this.state.selectedChart);
            if (selected) {
                if (dataPromise.fulfilled) {
                    return <TimeSeries measurementId={selected.id}
                                       fs={selected.measurementParameters.fs}
                                       dataPromise={dataPromise}/>
                } else if (dataPromise.pending) {
                    return (
                        <div>
                            <Message type="info" message="Loading"/>
                        </div>
                    );
                } else if (dataPromise.rejected) {
                    return (
                        <div>
                            <Message title="Unable to fetch data" type="danger" message={dataPromise.reason}/>
                        </div>
                    );
                }
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
                    <Message title="Unable to fetch data" type="danger" message={measurements.reason}/>
                </div>
            );
        } else if (allFetches.fulfilled) {
            const timeSeries = this.renderTimeSeriesIfAny();
            return (
                <Card>
                    <Card.Header as={'h6'} className={'bg-info'}>Measurements</Card.Header>
                    <Row>
                        <Col>
                            <Measurements measurements={this.props.measurements.value}
                                          fetcher={this.showTimeSeries}
                                          clearFunc={this.clearTimeSeries}
                                          showEditFunc={this.showEdit}
                                          clearEditFunc={this.clearEdit}
                                          selectedChart={this.state.selectedChart}
                                          selectedEdit={this.state.selectedEdit}/>
                            <EditMeasurement
                                selected={this.props.measurements.value.find(m => m.id === this.state.selectedEdit)}
                                clearEditFunc={this.clearEdit}/>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={8}>
                            {timeSeries}
                        </Col>
                        <Col md={{offset: 3, span: 1}}>
                            <ScheduleMeasurement deviceStatuses={this.props.deviceStatuses.value}/>
                        </Col>
                    </Row>
                </Card>
            );
        }
    }
}

export default connect((props) => ({
    deviceStatuses: {
        url: `${API_PREFIX}/devices`,
        refreshInterval: 1000,
        then: (states) => ({value: states.map(ds => ds.state.status)})
    },
    measurements: {url: `${API_PREFIX}/measurements`, refreshInterval: 1000},
    fetchMeasurementData: (measurementId) => ({
        [`fetchedData_${measurementId}`]: `${API_PREFIX}/measurements/${measurementId}/timeseries`
    })
}))(Measure)