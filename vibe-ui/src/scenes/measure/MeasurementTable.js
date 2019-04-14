import React, {Component} from "react";
import {Badge, Button, ButtonToolbar, OverlayTrigger, Table as RBTable, Tooltip} from "react-bootstrap";
import {Line} from "rc-progress";
import FontAwesome from "react-fontawesome";
import "./MeasurementTable.css";
import ReactTable from 'react-table'

const statusCell = ({original}) => {
    let label = null;
    switch (original.status) {
        case "COMPLETE":
            label = <Badge variant="success"><FontAwesome name="check"/></Badge>;
            break;
        case "RECORDING":
            label = <Badge variant="success"><FontAwesome name="spinner" spin/></Badge>;
            break;
        case "FAILED":
            label = <Badge variant="danger"><FontAwesome name="exclamation-triangle"/></Badge>;
            break;
        case "SCHEDULED":
            label = <Badge variant="success"><FontAwesome name="clock-o"/></Badge>;
            break;
        default:
            label = <Badge variant="warning"><FontAwesome name="question"/></Badge>;
            break;
    }
    const tooltip = <Tooltip id={original.status}>{original.status}</Tooltip>;
    return <OverlayTrigger placement="top" overlay={tooltip} trigger="click" rootClose>{label}</OverlayTrigger>;
};

const nameCell = ({original}) => {
    if (original.description && original.description.length > 0) {
        const tooltip = <Tooltip id={original.name}>{original.description}</Tooltip>;
        return (
            <OverlayTrigger placement="top" overlay={tooltip} trigger="click" rootClose>
                <div>{original.name}</div>
            </OverlayTrigger>
        );
    } else {
        return <div>{original.name}</div>;
    }
};

class ProgressCell extends Component {
    calculateProgress() {
        const samplesExpected = this.props.original.measurementParameters.fs * this.props.original.duration;
        const progressValues = Object.keys(this.props.original.recordingDevices)
            .map(key => this.props.original.recordingDevices[key].count);
        const samplesSoFar = Math.max(...progressValues);
        return Math.ceil(samplesSoFar / samplesExpected * 100);
    }

    render() {
        let progress = null;
        let percentage = 0;
        switch (this.props.original.status) {
            case "COMPLETE":
                percentage = 100;
                progress = <Line percent={percentage} strokeWidth="5" strokeColor="green"/>;
                break;
            case "RECORDING":
                percentage = this.calculateProgress();
                progress = <Line percent={percentage} strokeWidth="5" strokeColor="blue"/>;
                break;
            case "FAILED":
                percentage = this.calculateProgress();
                progress = <Line percent={percentage} strokeWidth="5" strokeColor="red"/>;
                break;
            case "SCHEDULED":
                progress = <Line percent={percentage} strokeWidth="5" strokeColor="green"/>;
                break;
            default:
                progress = <Line percent={percentage} strokeWidth="5" strokeColor="yellow"/>;
                break;
        }
        const tooltip = <Tooltip id={this.props.original.status}>{percentage}%</Tooltip>;
        return <OverlayTrigger placement="top" overlay={tooltip} trigger="click" rootClose>{progress}</OverlayTrigger>;
    }
}

const sensorCell = ({original}) => {
    const gyroIcon = original.measurementParameters.gyroEnabled ? "check-square-o" : "minus-square-o";
    const accelIcon = original.measurementParameters.accelerometerEnabled ? "check-square-o" : "minus-square-o";
    return (
        <span>
            <Badge variant="primary">Accelerometer  <FontAwesome name={accelIcon}/></Badge>
             <br/>
             <Badge variant="primary">Gyrometer  <FontAwesome name={gyroIcon}/></Badge>
        </span>
    );
};

class DeviceCell extends Component {
    createDetailTable = devices => {
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
            <RBTable responsive size="sm">
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
    };

    mapDevices = () => {
        const devices = new Map();
        Object.keys(this.props.original.recordingDevices).forEach(key => {
            devices.set(key, this.props.original.recordingDevices[key]);
        });
        return devices;
    };

    extractDeviceNames = (devices) => {
        return [...devices.keys()].join(',');
    };

    render() {
        const devices = this.mapDevices();
        const tooltip = <Tooltip id={this.props.original.name}>{this.createDetailTable(devices)}</Tooltip>;
        return (
            <OverlayTrigger placement="top" overlay={tooltip} trigger="click" rootClose>
                <div>{this.extractDeviceNames(devices)}</div>
            </OverlayTrigger>
        );
    }
}

class ActionCell extends Component {
    getEditButton = measurement => {
        if (measurement.status === 'COMPLETE') {
            if (measurement.isSelectedEdit) {
                return (
                    <Button variant="success" onClick={() => measurement.clearEdit()} size="sm">
                        <FontAwesome name="eject"/>
                    </Button>
                );
            } else {
                return (
                    <Button variant="primary" onClick={() => measurement.showEdit()} size="sm">
                        <FontAwesome name="pencil"/>
                    </Button>
                );
            }
        }
        return null;
    };

    getAnalyseButton = measurement => {
        if (measurement.status === 'COMPLETE') {
            if (measurement.isSelectedChart) {
                return (
                    <Button variant="success"
                            onClick={() => measurement.clearTimeSeries()} size="sm">
                        <FontAwesome name="eject"/>
                    </Button>
                );
            } else {
                return (
                    <Button variant="primary" onClick={() => measurement.fetchTimeSeries()} size="sm">
                        <FontAwesome name="line-chart"/>
                    </Button>
                );
            }
        }
        return null;
    };

    getDeleteButton = measurement => {
        let deletePromise = measurement.deleteResponse;
        if (deletePromise) {
            if (deletePromise.pending) {
                return <Button variant="danger" disabled size="sm"><FontAwesome name="spinner" spin/></Button>;
            } else if (deletePromise.rejected) {
                const code = deletePromise.meta.response.status;
                const text = deletePromise.meta.response.statusText;
                const tooltip = <Tooltip id={measurement.name}>{code} - {text}</Tooltip>;
                return (
                    <OverlayTrigger placement="top" overlay={tooltip}>
                        <div>
                            <Button variant="warning" size="sm">
                                <FontAwesome name="exclamation"/>&nbsp;FAILED
                            </Button>
                        </div>
                    </OverlayTrigger>
                );
            } else if (deletePromise.fulfilled) {
                return (
                    <Button variant="success" disabled size="sm">
                        <FontAwesome name="check"/>&nbsp;Deleted
                    </Button>
                );
            }
        } else {
            if (measurement.status === 'COMPLETE' || measurement.status === 'FAILED') {
                return (
                    <Button variant="danger" onClick={() => measurement.deleteMeasurement()}
                            size="sm">
                        <FontAwesome name="trash"/>
                    </Button>
                );
            }
        }
        return null;
    };

    render() {
        const editButton = this.getEditButton(this.props.original);
        const analyseButton = this.getAnalyseButton(this.props.original);
        const deleteButton = this.getDeleteButton(this.props.original);
        return <ButtonToolbar>{editButton}{analyseButton}{deleteButton}</ButtonToolbar>;
    }
}

const columns = [
    {accessor: 'id', Header: 'ID', show: false},
    {id: 'status', Header: 'Status', Cell: statusCell},
    {id: 'progress', Header: 'Progress', Cell: ProgressCell},
    {accessor: 'startTime', show: false},
    {accessor: 'name', Header: 'Name', sortable: true, filterable: true, Cell: nameCell},
    {accessor: 'date', Header: 'Date', sortable: true, filterable: true},
    {accessor: 'time', Header: 'Time', sortable: true},
    {accessor: 'fs', Header: 'Fs', sortable: true, filterable: true},
    {id: 'sensors', Header: 'Sensors', Cell: sensorCell},
    {id: 'devices', Header: 'Devices', filterable: true, Cell: DeviceCell},
    {id: 'actions', Header: 'Actions', Cell: ActionCell},
];

export default class MeasurementTable extends Component {
    render() {
        return (
            <ReactTable data={this.props.data}
                        columns={columns}
                        sortable={false}
                        defaultPageSize={5}
                        defaultSorted={[
                            {
                                id: "startTime",
                                desc: true
                            }
                        ]}
                        className={'-striped -highlight'}/>
        );
    }
}
