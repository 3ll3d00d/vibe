import React, {Component} from "react";
import {Table as RBTable, Label, Button, ButtonToolbar, OverlayTrigger, Tooltip} from "react-bootstrap";
import {Table, Thead, Th, Tr, Td} from "reactable";
import FontAwesome from "react-fontawesome";
import {connect} from "react-refetch";
import {Line} from 'rc-progress';
import './MeasurementTable.css';

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
        let deletePromise = this.props[`deleteMeasurementResponse_${measurement.id}`];
        if (deletePromise) {
            if (deletePromise.pending) {
                deleteButton =
                    <Button bsStyle="danger" disabled bsSize="xsmall"><FontAwesome name="spinner" spin/></Button>;
            } else if (deletePromise.rejected) {
                const code = deletePromise.meta.response.status;
                const text = deletePromise.meta.response.statusText;
                const tooltip = <Tooltip id={measurement.name}>{code} - {text}</Tooltip>;
                deleteButton =
                    <OverlayTrigger placement="top" overlay={tooltip}>
                        <div>
                            <Button bsStyle="warning" bsSize="xsmall">
                                <FontAwesome name="exclamation"/>&nbsp;FAILED
                            </Button>
                        </div>
                    </OverlayTrigger>;
            } else if (deletePromise.fulfilled) {
                deleteButton =
                    <Button bsStyle="success" disabled bsSize="xsmall">
                        <FontAwesome name="check"/>&nbsp;Deleted
                    </Button>;
            }
        } else {
            deleteButton =
                <Button bsStyle="danger" onClick={() => this.props.deleteMeasurement(measurement.id)} bsSize="xsmall">
                    <FontAwesome name="trash"/>
                </Button>;
        }
        const analyseButton =
            <Button bsStyle="primary" href={`/analyse/${measurement.name}`} bsSize="xsmall">
                <FontAwesome name="line-chart"/>
            </Button>;

        // TODO add failure reasons if a device fails
        return (
            <Tr key={measurement.name + "_" + measurement.startTime}>
                <Td column="status"><StatusCell status={measurement.status}/></Td>
                <Td column="progress"><ProgressCell measurement={measurement}/></Td>
                <Td column="name"><NameCell measurement={measurement}/></Td>
                <Td column="date">{measurement.startTime.split('_')[0]}</Td>
                <Td column="time">{measurement.startTime.split('_')[1]}</Td>
                <Td column="fs">{measurement.measurementParameters.fs}</Td>
                <Td column="sensors"><SensorCell accel={measurement.measurementParameters.accelerometerEnabled}
                                                 gyro={measurement.measurementParameters.gyroEnabled}/>
                </Td>
                <Td column="devices"><DeviceCell measurement={measurement}/></Td>
                <Td column="a"><ButtonToolbar>{analyseButton}{deleteButton}</ButtonToolbar></Td>
            </Tr>
        );
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
            'date',
            'time'
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
                <Th column="progress">Progress</Th>
                <Th column="name">Name</Th>
                <Th column="date">Date</Th>
                <Th column="time">Time</Th>
                <Th column="fs">Fs</Th>
                <Th column="sensors">Sensors</Th>
                <Th column="devices">Devices</Th>
                <Th column="a">&nbsp;</Th>
                </Thead>
                {rows}
            </Table>
        );
    }
}

class ProgressCell extends Component {

    calculateProgress() {
        const samplesExpected = this.props.measurement.measurementParameters.fs * this.props.measurement.duration;
        const samplesSoFar = Math.max([...Object.keys(this.props.measurement.recordingDevices).map(key => {
            return this.props.measurement.recordingDevices[key].count;
        })]);
        return Math.ceil(samplesSoFar / samplesExpected * 100);
    }

    render() {
        let progress = null;
        let percentage = 0;
        switch (this.props.measurement.status) {
            case "COMPLETE":
                percentage = 100;
                progress = <Line percent={percentage} strokeWidth="10" strokeColor="green"/>;
                break;
            case "RECORDING":
                percentage = this.calculateProgress();
                progress = <Line percent={percentage} strokeWidth="10" strokeColor="blue"/>;
                break;
            case "FAILED":
                percentage = this.calculateProgress();
                progress = <Line percent={percentage} strokeWidth="10" strokeColor="red"/>;
                break;
            case "SCHEDULED":
                progress = <Line percent={percentage} strokeWidth="10" strokeColor="green"/>;
                break;
            default:
                progress = <Line percent={percentage} strokeWidth="10" strokeColor="yellow"/>;
                break;
        }
        const tooltip = <Tooltip id={this.props.measurement.status}>{percentage}%</Tooltip>;
        return <OverlayTrigger placement="top" overlay={tooltip} trigger="click" rootClose>{progress}</OverlayTrigger>;
    }
}

class DeviceCell extends Component {
    createDetailTable(devices) {
        const rows = [];
        for (let kv of devices) {
            const row = <tr key={kv[0]}>
                <td>{kv[0]}</td>
                <td>{kv[1].state}</td>
                <td>{kv[1].count}</td>
                <td>{kv[1].time}</td>
                <td>{kv[1].reason}</td>
            </tr>;
            rows.push(row);
        }
        return (
            <RBTable responsive condensed>
                <thead>
                <tr>
                    <th>Device</th>
                    <th>State</th>
                    <th>Count</th>
                    <th>Last Update</th>
                    <th>Notes</th>
                </tr>
                </thead>
                <tbody>
                {rows}
                </tbody>
            </RBTable>
        );
    }

    mapDevices() {
        const devices = new Map();
        Object.keys(this.props.measurement.recordingDevices).forEach(key => {
            devices.set(key, this.props.measurement.recordingDevices[key]);
        });
        return devices;
    }

    extractDeviceNames(devices) {
        return [...devices.keys()].join(',');
    }

    render() {
        const devices = this.mapDevices();
        const tooltip = <Tooltip id={this.props.measurement.name}>{this.createDetailTable(devices)}</Tooltip>;
        return (
            <OverlayTrigger placement="top" overlay={tooltip} trigger="click" rootClose>
                <div>{this.extractDeviceNames(devices)}</div>
            </OverlayTrigger>
        );
    }
}

class NameCell extends Component {
    render() {
        const tooltip = <Tooltip id={this.props.measurement.name}>{this.props.measurement.description}</Tooltip>;
        return (
            <OverlayTrigger placement="top" overlay={tooltip} trigger="click" rootClose>
                <div>{this.props.measurement.name}</div>
            </OverlayTrigger>
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
                label = <Label bsStyle="success"><FontAwesome name="spinner" spin/></Label>;
                break;
            case "FAILED":
                label = <Label bsStyle="danger"><FontAwesome name="exclamation-triangle"/></Label>;
                break;
            case "SCHEDULED":
                label = <Label bsStyle="success"><FontAwesome name="clock-o"/></Label>;
                break;
            default:
                label = <Label bsStyle="warning"><FontAwesome name="question"/></Label>;
                break;
        }
        const tooltip = <Tooltip id={this.props.status}>{this.props.status}</Tooltip>;
        return <OverlayTrigger placement="top" overlay={tooltip} trigger="click" rootClose>{label}</OverlayTrigger>;
    }
}

class SensorCell extends Component {
    render() {
        const gyroIcon = this.props.gyro ? "check-square-o" : "minus-square-o";
        const accelIcon = this.props.accel ? "check-square-o" : "minus-square-o";
        return (
            <span>
                <Label bsStyle="primary">Accelerometer  <FontAwesome name={accelIcon}/></Label>
                <br/>
                <Label bsStyle="primary">Gyrometer  <FontAwesome name={gyroIcon}/></Label>
            </span>
        );
    }
}

export default connect(props => ({
    deleteMeasurement: measurementId => ({
        [`deleteMeasurementResponse_${measurementId}`]: {
            url: `/measurements/${measurementId}`,
            method: 'DELETE'
        }
    })
}))(MeasurementTable);
