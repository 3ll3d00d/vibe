import React, {Component} from "react";

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
        return (
            <td colSpan="2">
                OK - {this.props.deviceState.lastUpdateTime.toString()}
            </td>
        );
    }
}

class RecordingCell extends Component {
    render() {
        return <div></div>
    }
}

class FailedCell extends Component {
    render() {
        return <div></div>
    }
}

export default DeviceStatusCell;