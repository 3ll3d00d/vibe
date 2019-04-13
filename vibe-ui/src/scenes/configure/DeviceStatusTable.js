import React, {Component} from "react";
import {Card, Table} from "react-bootstrap";
import {DeviceStatusHeader, DeviceStatusRow} from "./DeviceStatusRow";

class DeviceStatusTable extends Component {

    render() {
        let rows = <div/>;
        if (this.props.deviceState) {
            rows = this.props.deviceState.map((state) => {
                return <DeviceStatusRow key={state.deviceId} deviceState={state} targetState={this.props.targetState}/>
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
            <Card>
                <Card.Header as={'h6'} className={"bg-info"}>Measurement Devices</Card.Header>
                <Table striped bordered hover responsive size="sm">
                    <DeviceStatusHeader/>
                    <tbody>
                    {rows}
                    </tbody>
                </Table>
            </Card>
        );
    }
}
export default DeviceStatusTable;
