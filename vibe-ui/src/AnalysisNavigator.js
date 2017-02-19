import React, {Component} from "react";
import {Button, ButtonGroup, ButtonToolbar, MenuItem, SplitButton} from "react-bootstrap";
import {LinkContainer} from "react-router-bootstrap";
import {connect} from "react-refetch";
import MultiSelect from "react-bootstrap-multiselect";
import "react-bootstrap-multiselect/css/bootstrap-multiselect.css";

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
        const {measurementId, deviceId} = this.props.params;
        if (measurementId) {
            const devices = Object.keys(this.props.data);
            const deviceOptions = devices.map((d) => {
                return (
                    <LinkContainer key={d} to={{pathname: `/analyse/${measurementId}/${d}`}}>
                        <MenuItem eventKey={d}>{d}</MenuItem>
                    </LinkContainer>
                );
            });
            let style = "";
            let title = "";
            if (deviceId) {
                title = `Device: ${deviceId}`;
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
        const {measurementId, deviceId, analyserId, series} = this.props.params;
        if (measurementId && deviceId) {
            const analysers = Object.keys(this.props.data[deviceId]);
            const seriesParams = series ? `/${series}` : "";
            const analyserOptions = analysers.map((a) => {
                return (
                    <LinkContainer key={a}
                                   to={{pathname: `/analyse/${measurementId}/${deviceId}/${a}${seriesParams}`}}>
                        <MenuItem eventKey={a}>{a}</MenuItem>
                    </LinkContainer>
                );
            });
            let style = "";
            let title = "";
            if (analyserId) {
                title = `Analysis: ${analyserId}`;
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

    createSeriesLinks() {
        const {measurementId, deviceId, analyserId, series} = this.props.params;
        if (measurementId && deviceId && analyserId) {
            const seriesAvailable = Object.keys(this.props.data[deviceId][analyserId]);
            return (
                <RoutingMultiSelect selected={series}
                                    available={seriesAvailable}
                                    linkURL={`/analyse/${measurementId}/${deviceId}/${analyserId}`}/>
            );
        } else {
            return <Button disabled>Series: ?</Button>;
        }
    }

    render() {
        return (
            <ButtonToolbar>
                <ButtonGroup>
                    {this.createMeasurementLinks()}
                </ButtonGroup>
                <ButtonGroup>
                    {this.createDeviceLinks()}
                </ButtonGroup>
                <ButtonGroup>
                    {this.createAnalysisLinks()}
                </ButtonGroup>
                {this.createSeriesLinks()}
            </ButtonToolbar>
        );
    };
}

class RoutingMultiSelect extends Component {
    constructor(props) {
        super(props);
        if (this.props.selected) {
            this.state = {selected: this.props.selected};
        } else {
            this.state = {selected: props.available.sort().join("-")};
        }
        this.handleChange.bind(this);
    }

    makeValues() {
        return this.props.available.sort().map((s) => {
            return {value: s, selected: this.isSelected(s)};
        });
    }

    isSelected(series) {
        return this.state.selected.split("-").includes(series);
    }

    handleChange = (element, checked) => {
        const selectedOption = element[0].value;
        this.setState((previousState, props) => {
            let previous = previousState.selected.split("-");
            if (previous.length === 1 && previous[0] === "") {
                previous = [];
            }
            const idx = previous.indexOf(selectedOption);
            if (idx >= 0 && !checked) {
                previous.splice(idx, 1);
            } else if (idx < 0 && checked) {
                previous.push(selectedOption);
            }
            return {selected: previous.sort().join("-")};
        });
    };

    render() {
        let bsStyle = "warning";
        if (this.props.selected === this.state.selected) {
            bsStyle = "success";
        }
        // note that https://github.com/twbs/bootstrap/issues/2724 causes the last button to lose the left radius
        return (
            <ButtonGroup>
                <MultiSelect buttonClass={`btn btn-${bsStyle}`} data={this.makeValues()} multiple
                             onChange={this.handleChange}/>
                <LinkContainer to={{pathname: `${this.props.linkURL}/${this.state.selected}`}}>
                    <Button bsStyle={bsStyle} style={{}}>Analyse</Button>
                </LinkContainer>
            </ButtonGroup>
        );
    }
}

export default connect(props => ({
    measurements: {
        url: `/measurements`,
        then: (measurements) => ({
            value: measurements.map(m => m.id)
        })
    }
}))(AnalysisNavigator)
