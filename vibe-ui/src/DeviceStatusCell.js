import React, {Component} from "react";
import {Label, OverlayTrigger, Tooltip} from "react-bootstrap";
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
        const label = <Label bsStyle="success"><FontAwesome name="check"/></Label>;
        const tooltip = <Tooltip id="ok">OK</Tooltip>;
        const body = <div>{label}&nbsp;{this.props.deviceState.lastUpdateTime.toString()}</div>;
        return (
            <td colSpan="2">
                <OverlayTrigger placement="top"
                                overlay={tooltip}>
                    {body}
                </OverlayTrigger>
            </td>
        );
    }
}

class RecordingCell extends Component {
    render() {
        const label = <Label bsStyle="warning"><FontAwesome name="spinner" spin/></Label>;
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
        const label = <Label bsStyle="danger"><FontAwesome name="exclamation"/></Label>;
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
