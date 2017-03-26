import React, {Component, PropTypes} from "react";
import {connect} from "react-refetch";
import MeasurementTable from "./MeasurementTable";

class Measurements extends Component {
    static contextTypes = {
        apiPrefix: PropTypes.string.isRequired
    };

    findResponse(id, responses) {
        const responseKey = `deleteMeasurementResponse_${id}`;
        if (responses.hasOwnProperty(responseKey)) {
            return responses[responseKey];
        }
        return null;
    }

    /**
     * Maps the delete function and any responses into the data row for rendering.
     * @param row the raw data received from the server.
     * @param responses any responses to delete requests.
     * @param deleteFunc the delete function.
     * @param fetchFunc the fetch time series function.
     * @parma selectedMeasurement the selected measurement, if any.
     * @returns {*}
     */
    convert(row, responses, deleteFunc, fetchFunc, clearFunc, selectedMeasurement) {
        const deleteMeasurement = () => deleteFunc(row.id);
        const fetchTimeSeries = () => fetchFunc(row.id);
        return Object.assign(row, {
            date: row.startTime.split('_')[0],
            time: row.startTime.split('_')[1],
            fs: row.measurementParameters.fs,
            deleteMeasurement: deleteMeasurement,
            deleteResponse: this.findResponse(row.id, responses),
            fetchTimeSeries: fetchTimeSeries,
            clearTimeSeries: clearFunc,
            isSelected: row.id === selectedMeasurement
        });
    }

    render() {
        const {measurements, deleteFunc, fetcher, clearFunc, selectedMeasurement, ...responses} = this.props;
        const data = measurements.map(m => this.convert(m, responses, deleteFunc, fetcher, clearFunc, selectedMeasurement));
        return <MeasurementTable data={data}/>
    }
}

export default connect((props, context) => ({
    deleteFunc: measurementId => ({
        [`deleteMeasurementResponse_${measurementId}`]: {
            url: `${context.apiPrefix}/measurements/${measurementId}`,
            method: 'DELETE'
        }
    })
}))(Measurements)
