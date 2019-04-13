import React, {Component} from "react";
import {connect} from "react-refetch";
import MeasurementTable from "./MeasurementTable";
import {API_PREFIX} from "../../App";

class Measurements extends Component {
    findResponse = (id, responses) => {
        const responseKey = `deleteMeasurementResponse_${id}`;
        if (responses.hasOwnProperty(responseKey)) {
            return responses[responseKey];
        }
        return null;
    };

    /**
     * Maps the delete function and any responses into the data row for rendering.
     * @param row the raw data received from the server.
     * @param responses any responses to delete requests.
     * @param deleteFunc the delete function.
     * @param fetchFunc the fetch time series function.
     * @param clearFunc the clear selected time series function.
     * @param showEditFunc shows the edit modal.
     * @param clearEditFunc closes the edit modal.
     * @param selectedChart the selected chart, if any.
     * @param selectedEdit the selected edit, if any.
     * @returns {*}
     */
    convert(row, responses, deleteFunc, fetchFunc, clearFunc, showEditFunc, clearEditFunc, selectedChart, selectedEdit) {
        const deleteMeasurement = () => deleteFunc(row.id);
        const fetchTimeSeries = () => fetchFunc(row.id);
        const showEdit = () => showEditFunc(row.id);
        return Object.assign(row, {
            date: row.startTime.split('_')[0],
            time: row.startTime.split('_')[1],
            fs: row.measurementParameters.fs,
            deleteMeasurement: deleteMeasurement,
            deleteResponse: this.findResponse(row.id, responses),
            fetchTimeSeries: fetchTimeSeries,
            clearTimeSeries: clearFunc,
            showEdit: showEdit,
            clearEdit: clearEditFunc,
            isSelectedChart: row.id === selectedChart,
            isSelectedEdit: row.id === selectedEdit
        });
    }

    render() {
        const {measurements, deleteFunc, fetcher, clearFunc, showEditFunc, clearEditFunc, selectedChart, selectedEdit, ...responses} = this.props;
        const data = measurements.map(m => this.convert(m, responses, deleteFunc, fetcher, clearFunc, showEditFunc, clearEditFunc, selectedChart, selectedEdit));
        return <MeasurementTable data={data}/>
    }
}

export default connect((props) => ({
    deleteFunc: measurementId => ({
        [`deleteMeasurementResponse_${measurementId}`]: {
            url: `${API_PREFIX}/measurements/${measurementId}`,
            method: 'DELETE'
        }
    })
}))(Measurements)
