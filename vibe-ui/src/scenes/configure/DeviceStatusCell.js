import React, {Component} from "react";
import {Badge, OverlayTrigger, Tooltip} from "react-bootstrap";
import FontAwesome from "react-fontawesome";

class DeviceStatusCell extends Component {
    render() {
        if (this.props.deviceState.state.status === 'INITIALISED') {
            return <InitialisedCell deviceState={this.props.deviceState}/>
        } else if (this.props.deviceState.state.status === 'RECORDING') {
            return <RecordingCell deviceState={this.props.deviceState}/>
        } else if (this.props.deviceState.state.status === 'FAILED') {
            return <FailedCell deviceState={this.props.deviceState}/>
        } else {
            return <td colSpan="2"/>
        }
    }
}

class InitialisedCell extends Component {
    render() {
        const label = <Badge variant="success"><FontAwesome name="check"/></Badge>;
        const tooltip = <Tooltip id="ok">OK</Tooltip>;
        const body = <div>{label}&nbsp;{this.props.deviceState.lastUpdateTime.toString()}</div>;
        return (
            <td colSpan="2">
                <OverlayTrigger placement="left" overlay={tooltip}>{body}</OverlayTrigger>
            </td>
        );
    }
}

class RecordingCell extends Component {
    render() {
        const label = <Badge variant="warning"><FontAwesome name="spinner" spin/></Badge>;
        const tooltip = <Tooltip id="recording">RECORDING</Tooltip>;
        return (
            <td colSpan="2">
                <OverlayTrigger placement="top"
                                overlay={tooltip}>
                    {label}&nbsp;{this.props.deviceState.lastUpdateTime.toString()}
                </OverlayTrigger>;
            </td>
        );
    }
}

class FailedCell extends Component {
    render() {
        const label = <Badge variant="danger"><FontAwesome name="exclamation"/></Badge>;
        const tooltip = <Tooltip id="failed">FAILED</Tooltip>;
        return (
            <td colSpan="2">
                <OverlayTrigger placement="top"
                                overlay={tooltip}>
                    {label}&nbsp;{this.props.deviceState.lastUpdateTime.toString()}
                </OverlayTrigger>;
            </td>
        );
    }
}

export default DeviceStatusCell;
