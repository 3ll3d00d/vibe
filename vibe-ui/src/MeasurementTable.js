import React, {Component} from "react";
import {Label, ButtonToolbar, Button, OverlayTrigger, Tooltip} from "react-bootstrap";
import {Table, Thead, Th, Tr, Td} from "reactable";
import FontAwesome from "react-fontawesome";
import {connect} from "react-refetch";

class MeasurementTable extends Component {
    constructor(props) {
        super(props);
        this.state = {filterText: ''};
        this.handleFilter = this.handleFilter.bind(this);
    }

    handleFilter = (text) => {
        this.setState({filterText: text});
    };

    dataRow(measurement) {
        let deleteButton = null;
        // TODO only set this row to a spinner
        if (this.props.deleteMeasurementResponse) {
            deleteButton =
                <Button bsStyle="danger" disabled>
                    <FontAwesome name="spinner" spin size="lg"/>&nbsp;Deleting
                </Button>;
        } else {
            deleteButton =
                <Button bsStyle="danger" onClick={() => this.props.deleteMeasurement(measurement.name)}>
                    <FontAwesome name="trash" size="lg"/>&nbsp;Delete
                </Button>;
        }
        const analyseButton =
            <Button bsStyle="primary" href={`/analyse/${measurement.name}`}>
                <FontAwesome name="line-chart" size="lg"/>&nbsp;Analyse
            </Button>;

        return (
            <Tr key={measurement.name + "_" + measurement.startTime}>
                <Td column="status"><StatusCell status={measurement.status}/></Td>
                <Td column="fs">{measurement.measurementParameters.fs}</Td>
                <Td column="sensors"><SensorCell accel={measurement.measurementParameters.accelerometerEnabled}
                                                 gyro={measurement.measurementParameters.gyroEnabled}/>
                </Td>
                <Td column="name">{measurement.name}</Td>
                <Td column="startTime">{measurement.startTime}</Td>
                <Td column="duration">{measurement.duration}</Td>
                <Td column="devices">{this.extractDeviceNames(measurement)}</Td>
                <Td column="actions">
                    <ButtonToolbar>
                        {analyseButton}
                        {deleteButton}
                    </ButtonToolbar>
                </Td>
            </Tr>
        );
    }

    extractDeviceNames(measurement) {
        const devices = new Map();
        Object.keys(measurement.recordingDevices).forEach(key => {
            devices.set(key, measurement.recordingDevices[key]);
        });
        return [...devices.keys()].join(',');
    }

    render() {
        let rows = null;
        if (this.props.measurements) {
            rows = this.props.measurements.map((measurement) => {
                return this.dataRow(measurement)
            });
        }
        const sortInfo = [
            'status',
            'fs',
            'name',
            'startTime',
            'duration'
        ];
        // TODO pagination styling as per https://github.com/glittershark/reactable/issues/4
        // TODO switch to custom filter fields to allow searching by individual columns
        return (
            <Table className="table table-fill table-striped table-bordered table-hover table-responsive"
                   itemsPerPage={10}
                   sortable={sortInfo}
                   defaultSort="startTime"
                   noDataText="No measurements available"
                   filterable={['startTime', 'name']}
                   filterBy={this.state.filterText}
                   onFilter={this.handleFilter}>
                <Thead>
                <Th column="status">Status</Th>
                <Th column="fs">Fs</Th>
                <Th column="sensors">Sensors</Th>
                <Th column="name">Name</Th>
                <Th column="startTime">Start Time</Th>
                <Th column="duration">Duration (seconds)</Th>
                <Th column="devices">Devices</Th>
                <Th column="actions">Actions</Th>
                </Thead>
                {rows}
            </Table>
        );
    }
}

class StatusCell extends Component {

    render() {
        let label = null;
        switch (this.props.status) {
            case "COMPLETE":
                label = <Label bsStyle="success"><FontAwesome name="check"/></Label>;
                break;
            case "RECORDING":
                label = <Label bsStyle="primary"><FontAwesome name="spinner" spin/></Label>;
                break;
            case "FAILED":
                label = <Label bsStyle="danger"><FontAwesome name="exclamation-triangle"/></Label>;
                break;
            default:
                label = <Label bsStyle="warning"><FontAwesome name="question"/></Label>;
                break;
        }
        const tooltip = <Tooltip id={this.props.status}>{this.props.status}</Tooltip>;
        return <OverlayTrigger placement="top" overlay={tooltip}>{label}</OverlayTrigger>;
    }
}

class SensorCell extends Component {
    render() {
        const gyroIcon = this.props.gyro ? "check-square-o" : "square-o";
        const accelIcon = this.props.accel ? "check-square-o" : "square-o";
        return (
            <span>
                <Label bsStyle="primary">Accelerometer  <FontAwesome name={accelIcon}/></Label>
                &nbsp;
                <Label bsStyle="primary">Gyrometer  <FontAwesome name={gyroIcon}/></Label>
            </span>
        );
    }
}

export default connect(props => ({
    deleteMeasurement: measurementId => ({
        deleteMeasurementResponse: {
            url: `/measurement/${measurementId}`,
            method: 'DELETE'
        }
    })
}))(MeasurementTable);
