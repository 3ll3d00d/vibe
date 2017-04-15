import React, {Component, PropTypes} from "react";
import {Button, ButtonToolbar, Label, OverlayTrigger, Table as RBTable, Tooltip} from "react-bootstrap";
import {Line} from "rc-progress";
import FontAwesome from "react-fontawesome";
import sematable, {Table} from "sematable";
import "./MeasurementTable.css";
import "react-select/dist/react-select.css";

const statusCell = ({row}) => {
    let label = null;
    switch (row.status) {
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
    const tooltip = <Tooltip id={row.status}>{row.status}</Tooltip>;
    return <OverlayTrigger placement="top" overlay={tooltip} trigger="click" rootClose>{label}</OverlayTrigger>;
};

const nameCell = ({row}) => {
    if (row.description && row.description.length > 0) {
        const tooltip = <Tooltip id={row.name}>{row.description}</Tooltip>;
        return (
            <OverlayTrigger placement="top" overlay={tooltip} trigger="click" rootClose>
                <div>{row.name}</div>
            </OverlayTrigger>
        );
    } else {
        return <div>{row.name}</div>;
    }
};

class ProgressCell extends Component {
    calculateProgress() {
        const samplesExpected = this.props.row.measurementParameters.fs * this.props.row.duration;
        const progressValues = Object.keys(this.props.row.recordingDevices)
                                     .map(key => this.props.row.recordingDevices[key].count);
        const samplesSoFar = Math.max(...progressValues);
        return Math.ceil(samplesSoFar / samplesExpected * 100);
    }

    render() {
        let progress = null;
        let percentage = 0;
        switch (this.props.row.status) {
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
        const tooltip = <Tooltip id={this.props.row.status}>{percentage}%</Tooltip>;
        return <OverlayTrigger placement="top" overlay={tooltip} trigger="click" rootClose>{progress}</OverlayTrigger>;
    }
}

const sensorCell = ({row}) => {
    const gyroIcon = row.measurementParameters.gyroEnabled ? "check-square-o" : "minus-square-o";
    const accelIcon = row.measurementParameters.accelerometerEnabled ? "check-square-o" : "minus-square-o";
    return (
        <span>
            <Label bsStyle="primary">Accelerometer  <FontAwesome name={accelIcon}/></Label>
             <br/>
             <Label bsStyle="primary">Gyrometer  <FontAwesome name={gyroIcon}/></Label>
        </span>
    );
};

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
        Object.keys(this.props.row.recordingDevices).forEach(key => {
            devices.set(key, this.props.row.recordingDevices[key]);
        });
        return devices;
    }

    extractDeviceNames(devices) {
        return [...devices.keys()].join(',');
    }

    render() {
        const devices = this.mapDevices();
        const tooltip = <Tooltip id={this.props.row.name}>{this.createDetailTable(devices)}</Tooltip>;
        return (
            <OverlayTrigger placement="top" overlay={tooltip} trigger="click" rootClose>
                <div>{this.extractDeviceNames(devices)}</div>
            </OverlayTrigger>
        );
    }
}

class ActionCell extends Component {
    getAnalyseButton(measurement) {
        if (measurement.status === 'COMPLETE') {
            if (measurement.isSelected) {
                return (
                    <Button bsStyle="success"
                            onClick={() => measurement.clearTimeSeries()} bsSize="xsmall">
                        <FontAwesome name="eject"/>
                    </Button>
                );
            } else {
                return (
                    <Button bsStyle="primary" onClick={() => measurement.fetchTimeSeries()} bsSize="xsmall">
                        <FontAwesome name="line-chart"/>
                    </Button>
                );
            }
        }
        return null;
    }

    getDeleteButton(row) {
        let deletePromise = row.deleteResponse;
        if (deletePromise) {
            if (deletePromise.pending) {
                return <Button bsStyle="danger" disabled bsSize="xsmall"><FontAwesome name="spinner" spin/></Button>;
            } else if (deletePromise.rejected) {
                const code = deletePromise.meta.response.status;
                const text = deletePromise.meta.response.statusText;
                const tooltip = <Tooltip id={row.name}>{code} - {text}</Tooltip>;
                return (
                    <OverlayTrigger placement="top" overlay={tooltip}>
                        <div>
                            <Button bsStyle="warning" bsSize="xsmall">
                                <FontAwesome name="exclamation"/>&nbsp;FAILED
                            </Button>
                        </div>
                    </OverlayTrigger>
                );
            } else if (deletePromise.fulfilled) {
                return (
                    <Button bsStyle="success" disabled bsSize="xsmall">
                        <FontAwesome name="check"/>&nbsp;Deleted
                    </Button>
                );
            }
        } else {
            if (row.status === 'COMPLETE' || row.status === 'FAILED') {
                return (
                    <Button bsStyle="danger" onClick={() => row.deleteMeasurement()}
                            bsSize="xsmall">
                        <FontAwesome name="trash"/>
                    </Button>
                );
            }
        }
        return null;
    }

    render() {
        const analyseButton = this.getAnalyseButton(this.props.row);
        const deleteButton = this.getDeleteButton(this.props.row);
        return <ButtonToolbar>{analyseButton}{deleteButton}</ButtonToolbar>;
    }
}

[ProgressCell, nameCell, statusCell, sensorCell, DeviceCell, ActionCell].forEach(m => {
    m.propTypes = {
        row: PropTypes.object.isRequired,
    }
});

const columns = [
    {key: 'id', header: 'ID', hidden: true, primaryKey: true},
    {key: 'status', header: 'Status', filterable: true, Component: statusCell},
    {key: 'progress', header: 'Progress', Component: ProgressCell},
    {key: 'startTime', hidden: true},
    {key: 'name', header: 'Name', sortable: true, filterable: true, Component: nameCell},
    {key: 'date', header: 'Date', sortable: true, filterable: true},
    {key: 'time', header: 'Time', sortable: true},
    {key: 'fs', header: 'Fs', sortable: true, searchable: true},
    {key: 'sensors', header: 'Sensors', Component: sensorCell},
    {key: 'devices', header: 'Devices', searchable: true, Component: DeviceCell},
    {key: 'actions', header: 'Actions', Component: ActionCell},
];

class MeasurementTable extends Component {
    render() {
        return (
            <Table {...this.props}
                   columns={columns}
                   className="table-responsive table-condensed table-bordered table-hover table-striped"/>
        );
    }
}

export default sematable('measurements', MeasurementTable, columns, {
    defaultPageSize: 6,
    sortKey: 'startTime',
    sortDirection: 'desc'
});
