import React, {Component} from "react";
import DeviceStatusCell from "./DeviceStatusCell";
import FontAwesome from "react-fontawesome";

const redStyle = {color: 'firebrick'};
const greenStyle = {color: 'green'};
const right = {float: 'right'};

export class DeviceStatusRow extends Component {
    render() {
        return (
            <tr key={this.props.deviceState.state.name}>
                <td>{this.props.deviceState.state.name}</td>
                <DeviceStatusCell deviceState={this.props.deviceState}/>
                <td>
                    {this.props.deviceState.state.fs}
                    <Valid a={this.props.deviceState.state.fs}
                           b={this.props.targetState.fs}/>
                </td>
                <td>
                    {this.props.deviceState.state.samplesPerBatch}
                    <Valid a={this.props.deviceState.state.samplesPerBatch}
                           b={this.props.targetState.samplesPerBatch}/>
                </td>
                <td>
                    <Enabled enabled={this.props.deviceState.state.accelerometerEnabled}/>
                    <Valid a={this.props.deviceState.state.accelerometerEnabled}
                           b={this.props.targetState.accelerometerEnabled}/>
                </td>
                <td>
                    {this.props.deviceState.state.accelerometerSens}
                    <Valid a={this.props.deviceState.state.accelerometerSens}
                           b={this.props.targetState.accelerometerSens}/>
                </td>
                <td>
                    <Enabled enabled={this.props.deviceState.state.gyroEnabled}/>
                    <Valid a={this.props.deviceState.state.gyroEnabled}
                           b={this.props.targetState.gyroEnabled}/>
                </td>
                <td>
                    {this.props.deviceState.state.gyroSens}
                    <Valid a={this.props.deviceState.state.gyroSens}
                           b={this.props.targetState.gyroSens}/>
                </td>
            </tr>
        );
    }
}

class Valid extends Component {
    render() {
        if (this.props.a !== this.props.b) {
            return <span style={right}><FontAwesome name="exclamation-triangle" style={redStyle}/></span>
        } else {
            return <span style={right}><FontAwesome name="check-square-o" style={greenStyle}/></span>
        }
    }
}

class Enabled extends Component {
    render() {
        if (this.props.enabled) {
            return <FontAwesome name="check" style={greenStyle}/>
        } else {
            return <FontAwesome name="times" style={redStyle}/>
        }
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
        let headerStyle = {textAlign: "center"};
        return (
            <tr key="header1">
                <th colSpan="5"/>
                <th colSpan="2" style={headerStyle}>Accelerometer</th>
                <th colSpan="2" style={headerStyle}>Gyro</th>
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