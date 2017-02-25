import React, {Component} from "react";
import {Button, ButtonGroup, ButtonToolbar, MenuItem, OverlayTrigger, SplitButton, Tooltip} from "react-bootstrap";
import NavigatorMultiSelect from "./NavigatorMultiSelect";
import FontAwesome from "react-fontawesome";
import "react-bootstrap-multiselect/css/bootstrap-multiselect.css";

export default class AnalysisNavigator extends Component {

    constructor(props) {
        super(props);
        this.navigate.bind(this);
    }

    navigate = (params) => {
        this.props.navigator(params);
    };

    createMeasurementLinks() {
        const measurementOptions = this.props.measurementMeta.map((m) => {
            let navFunc = () => this.navigate({measurementId: m.id});
            if (m.devices && m.devices.length === 1) {
                navFunc = () => this.navigate({measurementId: m.id, deviceId: m.devices[0]});
            }
            return <MenuItem key={m.id} eventKey={m.id} onClick={navFunc}>{m.id}</MenuItem>;
        });
        let title = null;
        let style = null;
        if (this.props.path && this.props.path.measurementId) {
            title = `Measurement: ${this.props.path.measurementId}`;
            style = "success";
        } else {
            style = "warning";
            title = "Select a measurement";
        }
        return (
            <SplitButton key="measurementSelector" bsStyle={style} title={title} id="measurementSelector">
                {measurementOptions}
            </SplitButton>
        );
    }

    createDeviceLinks() {
        let deviceOptions = [];
        let style = "default";
        let title = "Devices...";
        let disabled = true;
        if (this.props.path) {
            const {measurementId, deviceId} = this.props.path;
            if (measurementId) {
                const measurement = this.props.measurementMeta.find(m => m.id === measurementId);
                if (measurement) {
                    deviceOptions = measurement.devices.map((d) => {
                        const navigateFunc = () => this.navigate({measurementId: measurementId, deviceId: d});
                        return <MenuItem key={d} eventKey={d} onClick={navigateFunc}>{d}</MenuItem>;
                    });
                    if (deviceId) {
                        title = `Device: ${deviceId}`;
                        style = "success";
                    } else {
                        title = `Select a device`;
                        style = "warning";
                    }
                    disabled = false;
                }
            }
        }
        if (disabled) {
            return (
                <SplitButton disabled bsStyle={style} title={title} id="deviceSelector">
                    {deviceOptions}
                </SplitButton>
            );
        } else {
            return (
                <SplitButton bsStyle={style} title={title} id="deviceSelector">
                    {deviceOptions}
                </SplitButton>
            );
        }
    }

    createAnalysisLinks() {
        let analyserOptions = [];
        let style = "default";
        let title = "Analysis...";
        let disabled = true;
        if (this.props.path) {
            const {measurementId, deviceId, analyserId, series} = this.props.path;
            if (measurementId && deviceId) {
                const measurement = this.props.measurementMeta.find(m => m.id === measurementId);
                if (measurement) {
                    analyserOptions = measurement.analysis.map((a) => {
                        const navigateFunc = () => this.navigate({
                            measurementId: measurementId,
                            deviceId: deviceId,
                            analyserId: a,
                            series: series ? series : measurement.series.sort().join("-")
                        });
                        return <MenuItem key={a} eventKey={a} onClick={navigateFunc}>{a}</MenuItem>;
                    });
                    if (analyserId) {
                        title = `Analysis: ${analyserId}`;
                        style = "success";
                    } else {
                        title = `Select an analysis`;
                        style = "warning";
                    }
                    disabled = false;
                }
            }
        }
        if (disabled) {
            return (
                <SplitButton disabled bsStyle={style} title={title} id="analysisSelector">
                    {analyserOptions}
                </SplitButton>
            );
        } else {
            return (
                <SplitButton bsStyle={style} title={title} id="analysisSelector">
                    {analyserOptions}
                </SplitButton>
            );
        }
    }

    createSeriesLinks() {
        const {measurementId, deviceId, analyserId, series} = this.props.path;
        let available = [];
        if (measurementId && deviceId && analyserId) {
            const measurement = this.props.measurementMeta.find(m => m.id === measurementId);
            if (measurement) {
                available = measurement.series;
            }
        }
        const navigateFunc = (selected) => this.navigate({
            measurementId: measurementId,
            deviceId: deviceId,
            analyserId: analyserId,
            series: selected
        });
        return <NavigatorMultiSelect navigate={navigateFunc} selected={series} available={available}/>;
    }

    canAnalyse() {
        return this.props.path && this.props.path.measurementId && this.props.path.deviceId && this.props.path.analyserId;
    }

    createActionButtons() {
        const {path} = this.props;
        const actionButtons = [];
        let loadedOK = false;
        if (path && path.data) {
            if (path.data.pending) {
                actionButtons.push(
                    <Button key="loading" bsStyle="success">Loading... <FontAwesome name="spinner" spin/></Button>
                );
            } else if (path.data.rejected) {
                const tooltip = <Tooltip id={this.props.measurementId}>{path.data.reason.toString()}</Tooltip>;
                actionButtons.push(
                    <OverlayTrigger placement="top" overlay={tooltip}>
                        <Button bsStyle="danger">Failed<FontAwesome name="exclamation-triangle"/></Button>
                    </OverlayTrigger>
                );
            } else if (path.data.fulfilled) {
                loadedOK = true;
                actionButtons.push(
                    <Button key="loaded" bsStyle="success">Loaded <FontAwesome name="check"/></Button>
                );
            }
        }
        if (this.props.allowPlusAnalyse && this.canAnalyse()) {
            actionButtons.push(
                <Button key="add" onClick={() => this.props.addHandler()}><FontAwesome name="plus"/></Button>
            );
        }
        if (this.props.allowMinus) {
            actionButtons.push(
                <Button key="minus" onClick={() => this.props.removeHandler(this.props.path.id)}>
                    <FontAwesome name="minus"/>
                </Button>
            );
        }
        if (!loadedOK && this.props.allowPlusAnalyse && this.canAnalyse()) {
            actionButtons.push(
                <Button key="analyse" onClick={() => this.props.analysisHandler()}>
                    <FontAwesome name="line-chart"/>
                </Button>
            );
        }
        return actionButtons;
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
                <ButtonGroup>
                    {this.createSeriesLinks()}
                </ButtonGroup>
                <ButtonGroup>
                    {this.createActionButtons()}
                </ButtonGroup>
            </ButtonToolbar>
        );
    };
}
