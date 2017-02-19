import React, {Component} from "react";
import {ButtonGroup, Button, MenuItem, SplitButton} from "react-bootstrap";
import {LinkContainer} from "react-router-bootstrap";
import FontAwesome from "react-fontawesome";
import {connect} from "react-refetch";

class AnalysisNavigator extends Component {
    createMeasurementLinks() {
        let measurementSelector = null;
        if (this.props.measurements.pending) {
            measurementSelector = (
                <Button key="measurementPending" bsStyle="info" disabled>Measurements Loading </Button>
            );
        } else if (this.props.measurements.rejected) {
            measurementSelector = (
                <Button key="measurementFailed" bsStyle="danger" disabled>Load Failed
                    ${this.props.measurements.reason.toString()}</Button>
            );
        } else if (this.props.measurements.fulfilled) {
            const measurementOptions = this.props.measurements.value.map((m) => {
                return (
                    <LinkContainer key={m} to={{pathname: `/analyse/${m}`}}>
                        <MenuItem eventKey={m}>{m}</MenuItem>
                    </LinkContainer>
                );
            });
            let title = null;
            let style = null;
            if (this.props.params.measurementId) {
                title = `Measurement: ${this.props.params.measurementId}`;
                style = "success";
            } else {
                style = "warning";
                title = "Select a measurement";
            }
            measurementSelector =
                <SplitButton key="measurementSelector" bsStyle={style} title={title} id="measurementSelector">
                    {measurementOptions}
                </SplitButton>;
        }
        return measurementSelector;
    }

    createDeviceLinks() {
        let deviceSelector = null;
        if (this.props.params.measurementId) {
            const devices = Object.keys(this.props.data);
            const deviceOptions = devices.map((d) => {
                return (
                    <LinkContainer key={d} to={{pathname: `/analyse/${this.props.params.measurementId}/${d}`}}>
                        <MenuItem eventKey={d}>{d}</MenuItem>
                    </LinkContainer>
                );
            });
            let style = "";
            let title = "";
            if (this.props.params.deviceId) {
                title = `Device: ${this.props.params.deviceId}`;
                style = "success";
            } else {
                title = `Select a device`;
                style = "warning";
            }
            deviceSelector =
                <SplitButton bsStyle={style} title={title} id="deviceSelector">
                    {deviceOptions}
                </SplitButton>;
        } else {
            deviceSelector = <Button disabled>Device: ?</Button>;
        }
        return deviceSelector;
    }

    createAnalysisLinks() {
        let analyserSelector = null;
        if (this.props.params.measurementId && this.props.params.deviceId) {
            const analysers = Object.keys(this.props.data[this.props.params.deviceId]);
            const analyserOptions = analysers.map((a) => {
                return (
                    <LinkContainer key={a}
                                   to={{pathname: `/analyse/${this.props.params.measurementId}/${this.props.params.deviceId}/${a}`}}>
                        <MenuItem eventKey={a}>{a}</MenuItem>
                    </LinkContainer>
                );
            });
            let style = "";
            let title = "";
            if (this.props.params.analyserId) {
                title = `Analysis: ${this.props.params.analyserId}`;
                style = "success";
            } else {
                title = `Select an analysis`;
                style = "warning";
            }
            analyserSelector =
                <SplitButton bsStyle={style} title={title} id="analysisSelector">
                    {analyserOptions}
                </SplitButton>;
        } else {
            analyserSelector = <Button disabled>Analysis: ?</Button>;
        }
        return analyserSelector;
    }

    render() {
        return (
            <ButtonGroup>
                {this.createMeasurementLinks()}
                {this.createDeviceLinks()}
                {this.createAnalysisLinks()}
            </ButtonGroup>
        );
    };
}

export default connect(props => ({
    measurements: {
        url: `/measurements`,
        then: (measurements) => ({
            value: measurements.map(m => m.id)
        })
    }
}))(AnalysisNavigator)
