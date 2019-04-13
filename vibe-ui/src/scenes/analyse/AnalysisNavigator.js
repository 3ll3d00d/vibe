import React, {Component} from "react";
import {
    Button,
    ButtonGroup,
    ButtonToolbar,
    DropdownButton,
    DropdownItem,
    OverlayTrigger,
    Tooltip
} from "react-bootstrap";
import NavigatorMultiSelect from "./NavigatorMultiSelect";
import FontAwesome from "react-fontawesome";
import "react-bootstrap-multiselect/css/bootstrap-multiselect.css";
import PreciseIntNumericInput from "../../components/PreciseIntNumericInput";

export default class AnalysisNavigator extends Component {

    navigate = (params) => {
        this.props.navigator(params);
    };

    handleOffset = (targetName) => (valNum, valStr) => {
        this.setState((previousState, props) => { return {offset: valNum}; });
        this.navigate({type: 'target', measurementId: targetName, deviceId: valNum})
    };

    createTypeLinks() {
        let namedType;
        let style;
        if (this.props.type) {
            namedType = this.props.type === 'measure' ? 'Measurement' : 'Target';
            style = 'success';
        } else {
            namedType = 'Select a data source';
            style = 'warning';
        }
        return (
            <DropdownButton key="typeSelector" variant={style} title={namedType} id="typeSelector">
                <DropdownItem eventKey={1} onClick={() => this.navigate({type: 'measure'})}>Measurement</DropdownItem>
                <DropdownItem eventKey={2} onClick={() => this.navigate({type: 'target'})}>Target</DropdownItem>
            </DropdownButton>
        );
    }

    createTargetLinks() {
        const targetOptions = this.props.targetMeta.map((t) => {
            let navFunc = () => this.navigate({type: this.props.type, measurementId: t});
            return <DropdownItem key={t} eventKey={t} onClick={navFunc}>{t}</DropdownItem>;
        });
        let title = null;
        let style = null;
        if (this.props.path && this.props.path.targetName) {
            title = `Target: ${this.props.path.targetName}`;
            style = "success";
        } else {
            style = "warning";
            title = "Select a target";
        }
        return (
            <DropdownButton key="targetSelector" variant={style} title={title} id="targetSelector">
                {targetOptions}
            </DropdownButton>
        );
    }

    createTargetOffsetLinks() {
        return (
            <PreciseIntNumericInput value={this.props.path.offset}
                                    handler={this.handleOffset(this.props.path.targetName)}/>
        );
    }

    createMeasurementLinks() {
        const measurementOptions = this.props.measurementMeta.map((m) => {
            let navFunc = () => this.navigate({type: this.props.type, measurementId: m.id});
            if (m.devices && m.devices.length === 1) {
                navFunc = () => this.navigate({type: this.props.type, measurementId: m.id, deviceId: m.devices[0]});
            }
            return <DropdownItem key={m.id} eventKey={m.id} onClick={navFunc}>{m.id}</DropdownItem>;
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
            <DropdownButton key="measurementSelector" variant={style} title={title} id="measurementSelector">
                {measurementOptions}
            </DropdownButton>
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
                        const navigateFunc = () => this.navigate({type: this.props.type, measurementId: measurementId, deviceId: d});
                        return <DropdownItem key={d} eventKey={d} onClick={navigateFunc}>{d}</DropdownItem>;
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
                <DropdownButton disabled variant={style} title={title} id="deviceSelector">
                    {deviceOptions}
                </DropdownButton>
            );
        } else {
            return (
                <DropdownButton variant={style} title={title} id="deviceSelector">
                    {deviceOptions}
                </DropdownButton>
            );
        }
    }

    createAnalysisLinks() {
        let analyserOptions = [];
        let style = "default";
        let title = "Analysis...";
        let disabled = true;
        if (this.props.path) {
            const {measurementId, deviceId, analyserId} = this.props.path;
            const series = this.props.path.encodeSelectedSeries();
            if (measurementId && deviceId) {
                const measurement = this.props.measurementMeta.find(m => m.id === measurementId);
                if (measurement) {
                    analyserOptions = Object.keys(measurement.analysis).map((a) => {
                        let seriesLink = measurement.analysis[a].sort().join("-");
                        if (series) {
                            seriesLink = series.split('-').filter(s => measurement.analysis[a].includes(s)).join('-');
                        }
                        const navigateFunc = () => this.navigate({
                            type: this.props.type,
                            measurementId: measurementId,
                            deviceId: deviceId,
                            analyserId: a,
                            series: seriesLink
                        });
                        return <DropdownItem key={a} eventKey={a} onClick={navigateFunc}>{a}</DropdownItem>;
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
                <DropdownButton disabled variant={style} title={title} id="analysisSelector">
                    {analyserOptions}
                </DropdownButton>
            );
        } else {
            return (
                <DropdownButton variant={style} title={title} id="analysisSelector">
                    {analyserOptions}
                </DropdownButton>
            );
        }
    }

    createSeriesLinks() {
        const {measurementId, deviceId, analyserId} = this.props.path;
        const series = this.props.path.encodeSelectedSeries();
        let available = [];
        if (measurementId && deviceId && analyserId) {
            const measurement = this.props.measurementMeta.find(m => m.id === measurementId);
            if (measurement) {
                available = measurement.analysis[analyserId];
            }
        }
        const navigateFunc = (selected) => this.navigate({
            type: this.props.type,
            measurementId: measurementId,
            deviceId: deviceId,
            analyserId: analyserId,
            series: selected
        });
        return <NavigatorMultiSelect analyserId={analyserId}
                                     navigate={navigateFunc}
                                     selected={series}
                                     available={available}/>;
    }

    /**
     * @returns {*|null} true if this path is complete (i.e. has a value for every aspect)
     */
    pathIsComplete() {
        if (this.props.type === 'measure') {
            return this.props.path && this.props.path.measurementId && this.props.path.deviceId && this.props.path.analyserId;
        } else if (this.props.type === 'target') {
            return this.props.path && this.props.path.targetName;
        }
        return false;
    }

    /**
     * Calculates which buttons to show. This means;
     * - if the path has data, indicate the state of that data (loading/loaded/failed)
     * - on the last path, and if that path is complete, show the + button to allow the user to add a path
     * - on every path, except when we have just 1 path, show the - button to allow the user to delete that path
     * - on any path which is complete and has data available show the eject button to remove the path from the chart
     * - on any path which is complete but does not have data available, show the play button to load the path into the chart.
     * @returns {Array}
     */
    createActionButtons() {
        const {path} = this.props;
        const actionButtons = [];
        let loadedOK = false;
        if (path && path.data) {
            if (path.data.pending) {
                actionButtons.push(
                    <Button key="loading" variant="success">Loading... <FontAwesome name="spinner" spin/></Button>
                );
            } else if (path.data.rejected) {
                const tooltip = <Tooltip id={path.getExternalId()}>{path.data.reason.toString()}</Tooltip>;
                actionButtons.push(
                    <OverlayTrigger key="failed" placement="top" overlay={tooltip}>
                        <Button variant="danger">Failed<FontAwesome name="exclamation-triangle"/></Button>
                    </OverlayTrigger>
                );
            } else if (path.data.fulfilled) {
                loadedOK = true;
                actionButtons.push(
                    <Button key="loaded" variant="success">Loaded <FontAwesome name="check"/></Button>
                );
            }
        }
        if (this.props.isLastPath && this.pathIsComplete()) {
            actionButtons.push(
                <Button key="add" onClick={() => this.props.addHandler()}><FontAwesome name="plus"/></Button>
            );
        }
        if (this.props.isNotFirstAndOnlyPath) {
            actionButtons.push(
                <Button key="minus" onClick={() => this.props.removeHandler()}>
                    <FontAwesome name="minus"/>
                </Button>
            );
        }
        if (this.pathIsComplete()) {
            if (loadedOK) {
                if (this.props.path.hasSelectedSeries()) {
                    if (this.props.path.loaded) {
                        actionButtons.push(
                            <Button key="unload" onClick={() => this.props.unloadHandler()}>
                                <FontAwesome name="eject"/>
                            </Button>
                        );
                    } else {
                        actionButtons.push(
                            <Button key="analyse" onClick={() => this.props.analysisHandler()}>
                                <FontAwesome name="play"/>
                            </Button>
                        );
                    }
                } else {
                    actionButtons.push(
                        <Button disabled key="analyse" onClick={() => this.props.analysisHandler()}>
                            <FontAwesome name="play"/>
                        </Button>
                    );
                }
            } else {
                if (this.props.path.hasSelectedSeries()) {
                    actionButtons.push(
                        <Button key="analyse" onClick={() => this.props.analysisHandler()}>
                            <FontAwesome name="play"/>
                        </Button>
                    );
                } else {
                    actionButtons.push(
                        <Button disabled key="analyse" onClick={() => this.props.analysisHandler()}>
                            <FontAwesome name="play"/>
                        </Button>
                    );
                }
            }
        }
        return actionButtons;
    }

    render() {
        const {path, type = 'measure'} = this.props;
        if (!path) {
            return (
                <ButtonToolbar>
                    <ButtonGroup>
                        {this.createTypeLinks()}
                    </ButtonGroup>
                </ButtonToolbar>
            );
        } else {
            if (type === 'measure') {
                return (
                    <ButtonToolbar>
                        <ButtonGroup>
                            {this.createTypeLinks()}
                        </ButtonGroup>
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
            } else {
                const targetOffset = (
                    <ButtonGroup>
                        {this.createTargetOffsetLinks()}
                    </ButtonGroup>
                );
                const offset = this.props.path.targetName ? targetOffset : null;
                return (
                    <ButtonToolbar>
                        <ButtonGroup>
                            {this.createTypeLinks()}
                        </ButtonGroup>
                        <ButtonGroup>
                            {this.createTargetLinks()}
                        </ButtonGroup>
                        {offset}
                        <ButtonGroup>
                            {this.createActionButtons()}
                        </ButtonGroup>
                    </ButtonToolbar>
                );
            }
        }
    }
}
