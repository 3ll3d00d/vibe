import React, {Component} from "react";
import {Table, Panel} from "react-bootstrap";
import {DeviceStatusRow, DeviceStatusHeader} from "./DeviceStatusRow";

class DeviceStatusTable extends Component {

    render() {
        let rows = <div/>;
        if (this.props.deviceState) {
            rows = this.props.deviceState.map((state) => {
                return <DeviceStatusRow key={state.deviceId} deviceState={state}/>
            });
        }
        if (rows.length === 0) {
            rows = (
                <tr>
                    <td colSpan="9">No devices registered</td>
                </tr>
            );
        }
        return (
            <Panel header="Measurement Devices" bsStyle="info">
                <Table striped bordered condensed hover fill>
                    <DeviceStatusHeader/>
                    <tbody>
                    {rows}
                    </tbody>
                </Table>
            </Panel>
        );
    }
}
export default DeviceStatusTable;
