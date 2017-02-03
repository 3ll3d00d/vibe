import React, {Component} from "react";
import DeviceStatusCell from "./DeviceStatusCell";

export class DeviceStatusRow extends Component {
    render() {
        return (
            <tr>
                <td>{this.props.deviceState.state.name}</td>
                <DeviceStatusCell deviceState={this.props.deviceState}/>
                <td>{this.props.deviceState.state.fs}</td>
                <td>{this.props.deviceState.state.samplesPerBatch}</td>
                <td>{this.props.deviceState.state.accelerometerEnabled.toString()}</td>
                <td>{this.props.deviceState.state.accelerometerSens}</td>
                <td>{this.props.deviceState.state.gyroEnabled.toString()}</td>
                <td>{this.props.deviceState.state.gyroSens}</td>
            </tr>
        );
    }
}

export class DeviceStatusHeader extends Component {
    render() {
        return (
            <thead>
                <HeaderOne/>
                <HeaderTwo/>
            </thead>
        );
    }
}

class HeaderOne extends Component {
    render() {
        return (
            <tr key="header1">
                <th colSpan="5"/>
                <th colSpan="2">Accelerometer</th>
                <th colSpan="2">Gyro</th>
            </tr>
        );
    }
}

class HeaderTwo extends Component {
    render() {
        return (
            <tr key="header2">
                <th>Device Name</th>
                <th colSpan="2">Status</th>
                <th>Sample Rate</th>
                <th>Batch Size</th>
                <th>Enabled</th>
                <th>Sensitivity</th>
                <th>Enabled</th>
                <th>Sensitivity</th>
            </tr>
        );
    }
}