import React, {Component} from "react";
import PropTypes from "prop-types";
import {Button, Card, Col, FormControl, FormGroup, FormLabel, Row} from "react-bootstrap";
import ToggleButton from "react-toggle-button";
import FontAwesome from "react-fontawesome";
import LineChart from "./LineChart";
import PreciseIntNumericInput from "../PreciseIntNumericInput";
import {NO_OPTION_SELECTED} from "../../constants";
import {getAnalysisChartConfig} from "./ConfigGenerator";
import ChartCustomiser from "./ChartCustomiser";

export default class ChartController extends Component {

    static propTypes = {
        range: PropTypes.object.isRequired,
        series: PropTypes.array.isRequired,
        referenceSeriesId: PropTypes.string,
        referenceSeriesHandler: PropTypes.func
    };

    constructor(props) {
        super(props);
        this.state = this.createInitialState(props);
    }

    createInitialState(props) {
        const state = {
            minX: -100,
            maxX: -100,
            minY: -100,
            maxY: -100,
            xLog: true,
            dots: false,
            chartDataUrl: null,
            actualChartDimensions: {},
            customChartConfig: null,
            exportModalState: false
        };
        return Object.assign(state, this.createChartConfig(state, props.range));
    }

    handleExportChart = (parameters) => {
        const {height, width} = parameters;
        this.setState({chartDataUrl: parameters.url, actualChartDimensions: {height, width}});
    };

    createChartConfig(state, range) {
        const yRange = [this.chooseValue('minY', state, range), this.chooseValue('maxY', state, range)];
        const minX = Math.round(this.chooseValue('minX', state, range) * 10) / 10;
        const xRange = [minX === 0 ? 0.1 : minX, this.chooseValue('maxX', state, range)];
        return {config: getAnalysisChartConfig(xRange, yRange, state.xLog, state.dots)};
    }

    handleMinX = (valNum, valStr) => {
        this.setState((previousState, props) => {
            const val = props.range.minX !== valNum ? valNum : previousState.minX;
            return {minX: val};
        });
    };
    handleMaxX = (valNum, valStr) => {
        this.setState((previousState, props) => {
            const val = props.range.maxX !== valNum ? valNum : previousState.maxX;
            return {maxX: val};
        });
    };
    handleMinY = (valNum, valStr) => {
        this.setState((previousState, props) => {
            const val = props.range.minY !== valNum ? valNum : previousState.minY;
            return {minY: val};
        });
    };
    handleMaxY = (valNum, valStr) => {
        this.setState((previousState, props) => {
            const val = props.range.maxY !== valNum ? valNum : previousState.maxY;
            return {maxY: val};
        });
    };
    handleLinLogChange = () => {
        this.setState((previousState, props) => {
            return {xLog: !previousState.xLog};
        });
    };
    handleDotsChange = () => {
        this.setState((previousState, props) => {
            return {dots: !previousState.dots};
        });
    };
    renderChart = () => {
        this.setState((previousState, props) => {
            return this.createChartConfig(previousState, props.range);
        });
    };
    resetChart = () => {
        this.setState((previousState, props) => {
            return this.createInitialState(props);
        });
    };
    toggleExportModal = () => {
        this.setState((previousState, props) => {
            return {exportModalState: !previousState.exportModalState};
        });
    };
    getCustomChartConfig = () => {
        if (this.state.customChartConfig) {
            return this.state.customChartConfig;
        }
        return null;
    };
    updateCustomChartConfig = (config) => {
        this.setState({customChartConfig: config});
    };
    resetCustomChartConfig = () => {
        this.setState({customChartConfig: null});
    };

    chooseValue(name, state, range) {
        return state[name] !== -100 ? state[name] : range[name];
    }

    makeReferenceSeriesOptions() {
        return [...new Set(this.props.series.map(s => `${s.id}/${s.series}`))].sort().map(val => {
            return <option key={val} value={val}>{val}</option>
        });
    }

    /**
     * Creates a reference series selector if we have >1 series in the chart and a handler if available.
     * @returns {*}
     */
    makeReferenceSeriesSelector() {
        if (this.props.referenceSeriesHandler) {
            const options = this.makeReferenceSeriesOptions();
            if (options && options.length > 1) {
                return (
                    <FormGroup controlId="normalise">
                        <FormLabel>Reference Series:</FormLabel>
                        <FormControl as="select"
                                     value={this.props.referenceSeriesId}
                                     onChange={this.props.referenceSeriesHandler}
                                     placeholder="select">
                            <option key="disabled" value={NO_OPTION_SELECTED}>Disabled</option>
                            {options}
                        </FormControl>
                    </FormGroup>
                );
            }
        }
        return null;
    }

    /**
     * Updates the chart config if the range has changed and the user hasn't overridden them.
     * @param nextProps the new props
     */
    componentWillReceiveProps(nextProps) {
        this.setState((previousState, props) => this.createChartConfig(previousState, nextProps.range));
    }

    getDownloadButton = () => {
        return <Button onClick={this.toggleExportModal} size="sm"><FontAwesome name="download"/></Button>;
    };

    render() {
        const updateButton = <Button onClick={this.renderChart} size="sm"><FontAwesome name="repeat"/></Button>;
        const resetButton = <Button onClick={this.resetChart} size="sm"><FontAwesome name="undo"/></Button>;
        return (
            <div>
                <ChartCustomiser visible={this.state.exportModalState}
                                 toggleVisibility={this.toggleExportModal}
                                 currentChartDimensions={this.state.actualChartDimensions}
                                 currentChartURL={this.state.chartDataUrl}
                                 resetCustomChartConfig={this.resetCustomChartConfig}
                                 updateChart={this.updateCustomChartConfig}/>
                <Card size="sm" bg="light">
                    <Row className={'align-items-center'}>
                        <Col md={6}>
                            <Row>
                                <Col md={{span: 4, offset: 4}}>
                                    <PreciseIntNumericInput
                                        value={this.chooseValue('maxY', this.state, this.props.range)}
                                        handler={this.handleMaxY}/>
                                </Col>
                            </Row>
                            <Row className={'justify-content-md-center'}>
                                <Col md={4}>
                                    <PreciseIntNumericInput
                                        value={this.chooseValue('minX', this.state, this.props.range)}
                                        handler={this.handleMinX}/>
                                </Col>
                                <Col md={4}>
                                    <ToggleButton activeLabel="x log"
                                                  inactiveLabel="x lin"
                                                  value={this.state.xLog}
                                                  onToggle={this.handleLinLogChange}/>
                                    <ToggleButton activeLabel="dots"
                                                  inactiveLabel="dots"
                                                  value={this.state.dots}
                                                  onToggle={this.handleDotsChange}/>
                                </Col>
                                <Col md={4}>
                                    <PreciseIntNumericInput
                                        value={this.chooseValue('maxX', this.state, this.props.range)}
                                        handler={this.handleMaxX}/>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={{span: 4, offset: 4}}>
                                    <PreciseIntNumericInput
                                        value={this.chooseValue('minY', this.state, this.props.range)}
                                        handler={this.handleMinY}/>
                                </Col>
                            </Row>
                        </Col>
                        <Col md={2}>
                            {updateButton}{resetButton}{this.getDownloadButton()}
                        </Col>
                        <Col md={4}>
                            {this.makeReferenceSeriesSelector()}
                        </Col>
                    </Row>
                </Card>
                <Row>
                    <Col>
                        <LineChart series={this.props.series}
                                   config={this.state.config}
                                   chartExportHandler={this.handleExportChart}
                                   customChartConfig={this.getCustomChartConfig()}/>
                    </Col>
                </Row>
            </div>
        );
    }
}

