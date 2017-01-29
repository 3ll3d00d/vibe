import React, {Component} from "react";
import {Table, Panel} from "react-bootstrap";

class Status extends Component {

    render() {
        let columns = this.props.deviceState.map((state) => {
            return <tr key={state.deviceName}>
                <td>{state.deviceName}</td>
                <td>{state.lastUpdate.toString()}</td>
                <td>{state.status}</td>
                <td>{state.failureCode}</td>
            </tr>
        });
        let table =
            <Table striped bordered condensed hover fill>
                <thead>
                <tr key="header">
                    <th>Device Name</th>
                    <th>Last Ping Time</th>
                    <th>Current State</th>
                    <th>Failure Reason</th>
                </tr>
                </thead>
                <tbody>
                {columns}
                </tbody>
            </Table>;
        let panelStyle = this.props.alert ? "danger" : "info";
        let panel =
            <Panel header="Current Status" bsStyle={panelStyle}>
                {this.props.message}
                {table}
            </Panel>;
        return (
            <div>
                {panel}
            </div>
        );
    }
}
export default Status;
