import React, {Component} from "react";
import {
    Button,
    Col,
    ControlLabel,
    FormControl,
    FormGroup,
    InputGroup,
    OverlayTrigger,
    Row,
    Tooltip,
    Well
} from "react-bootstrap";
import ToggleButton from "react-toggle-button";
import FontAwesome from "react-fontawesome";
import Chart from "./Chart";
import PreciseIntNumericInput from "./PreciseIntNumericInput";
import {calculateRange} from "./Analyse";

export default class ChartController extends Component {

    constructor(props) {
        super(props);
        this.state = this.createInitialState(props);
        this.handleMinX.bind(this);
        this.handleMaxX.bind(this);
        this.handleMinY.bind(this);
        this.handleMaxY.bind(this);
        this.handleLinLogChange.bind(this);
        this.handleDotsChange.bind(this);
        this.renderChart.bind(this);
        this.resetChart.bind(this);
        this.handleNormalise.bind(this);
    }

    createInitialState(props) {
        const state = {
            minX: -100,
            maxX: -100,
            minY: -100,
            maxY: -100,
            xLog: true,
            dots: false,
            normalise: null
        };
        return Object.assign(state, this.createChartConfig(state, props.range));
    }

    createChartConfig(state, range) {
        return {
            config: {
                x: [this.chooseValue('minX', state, range), this.chooseValue('maxX', state, range)],
                y: [this.chooseValue('minY', state, range), this.chooseValue('maxY', state, range)],
                xLog: state.xLog,
                showDots: state.dots,
                normalise: this.getSeriesToNormaliseOn(state, this.props.series)
            }
        };
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
            console.log("MinY: " + valNum + "/" + valStr + "/" + val);
            return {minY: val};
        });
    };
    handleMaxY = (valNum, valStr) => {
        this.setState((previousState, props) => {
            const val = props.range.maxY !== valNum ? valNum : previousState.maxY;
            console.log("MaxY: " + valNum + "/" + valStr + "/" + val);
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
    handleNormalise = (event) => {
        const val = event.target.value === "-1" ? null : event.target.value;
        this.setState((previousState, props) => {
            return {normalise: val}
        });
    };

    makeYFields(range) {
        const yTip = <Tooltip id={"y"}>Y Axis Range</Tooltip>;
        return <OverlayTrigger placement="top" overlay={yTip} trigger="click" rootClose>
            <InputGroup bsSize="small">
                <InputGroup.Addon>
                    <FontAwesome name="arrows-v"/>
                </InputGroup.Addon>
                <PreciseIntNumericInput value={this.chooseValue('maxY', this.state, range)}
                                        handler={this.handleMaxY}/>
                <PreciseIntNumericInput value={this.chooseValue('minY', this.state, range)}
                                        handler={this.handleMinY}/>
            </InputGroup>
        </OverlayTrigger>;
    }

    makeXFields(range) {
        const xTip = <Tooltip id={"x"}>X Axis Range</Tooltip>;
        return <OverlayTrigger placement="top" overlay={xTip} trigger="click" rootClose>
            <InputGroup>
                <InputGroup.Addon>
                    <FontAwesome name="arrows-h"/>
                </InputGroup.Addon>
                <PreciseIntNumericInput value={this.chooseValue('minX', this.state, range)}
                                        handler={this.handleMinX}/>
                <PreciseIntNumericInput value={this.chooseValue('maxX', this.state, range)}
                                        handler={this.handleMaxX}/>
            </InputGroup>
        </OverlayTrigger>;
    }

    chooseValue(name, state, range) {
        return state[name] !== -100 ? state[name] : range[name];
    }

    makeNormaliseOptions() {
        return this.props.series.map(s => {
            const val = `${s.id}/${s.series}`;
            return <option key={val} value={val}>{val}</option>
        });
    }

    getSeriesToNormaliseOn(state, series) {
        const can = state.normalise && series.map(s => `${s.id}/${s.series}`).includes(state.normalise);
        return can ? state.normalise : "-1";
    }

    /**
     * Gets the data to pass to the chart, normalising it if required.
     * @returns {*}
     */
    normalisedDataIfNecessary() {
        const normaliseSeries = this.getSeriesToNormaliseOn(this.state, this.props.series);
        if (normaliseSeries === "-1") {
            return this.props.series;
        }
        return this.normalise(normaliseSeries);
    }

    /**
     * Returns a copy of the data that has been normalised against the reference series.
     * @param referenceSeriesId the selected reference series.
     */
    normalise(referenceSeriesId) {
        const referenceSeries = this.props.series.find(s => referenceSeriesId === (s.id + '/' + s.series));
        return this.props.series.map(s => {
            return this.normaliseSeries(referenceSeries, s)
        });
    }

    /**
     * Returns a copy of the unnormalised series normalised against the given reference series.
     * @param referenceSeries the reference.
     * @param unnormalisedSeries the series to normalise.
     * @returns {Array} the normalised series.
     */
    normaliseSeries(referenceSeries, unnormalisedSeries) {
        const normedData = new Array(unnormalisedSeries.xyz.length);
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;
        referenceSeries.xyz.forEach((val, idx) => {
            const normedVal = unnormalisedSeries.xyz[idx].y - val.y;
            normedData[idx] = {x: unnormalisedSeries.xyz[idx].x, y: normedVal, z: unnormalisedSeries.xyz[idx].z};
            minY = Math.min(minY, normedVal);
            maxY = Math.max(maxY, normedVal);
        });
        // copy twice to make sure the new normed data doesn't overwrite the data stored in the props
        const copy = Object.assign({}, unnormalisedSeries);
        return Object.assign(copy, {xyz: normedData, minY: minY, maxY: maxY});
    }

    /**
     * Fix the chart range so we can see normalised data if required.
     * @param chartData the new chart data.
     * @returns the chart config.
     */
    normalisedChartConfigIfNecessary(chartData) {
        if (this.getSeriesToNormaliseOn(this.state, this.props.series) !== "-1") {
            return this.createChartConfig(this.state, calculateRange(chartData)).config;
        } else {
            return this.state.config;
        }
    }

    /**
     * Updates the chart config if the range has changed and the user hasn't overridden them.
     * @param nextProps the new props
     */
    componentWillReceiveProps(nextProps) {
        this.setState((previousState, props) => this.createChartConfig(previousState, nextProps.range));
    }

    render() {
        const xRange = this.makeXFields(this.props.range);
        const yRange = this.makeYFields(this.props.range);
        const updateButton = <Button onClick={this.renderChart}>Update</Button>;
        const resetButton = <Button onClick={this.resetChart}>Reset</Button>;
        const chartData = this.normalisedDataIfNecessary();
        const chartConfig = this.normalisedChartConfigIfNecessary(chartData);
        return (
            <div>
                <Well bsSize="small">
                    <Row>
                        <Col md={2} xs={4}>{xRange}</Col>
                        <Col md={1} xs={2}>
                            <ToggleButton activeLabel="x log"
                                          inactiveLabel="x lin"
                                          value={this.state.xLog}
                                          onToggle={() => this.handleLinLogChange}/>
                            <ToggleButton activeLabel="dots"
                                          inactiveLabel="dots"
                                          value={this.state.dots}
                                          onToggle={this.handleDotsChange}/>
                        </Col>
                        <Col md={2} xs={4}>{yRange}</Col>
                        <Col md={1} xsHidden={true}>
                            {updateButton}{resetButton}
                        </Col>
                        <Col md={6} xs={8}>
                            <FormGroup controlId="normalise">
                                <ControlLabel>Normalise?</ControlLabel>
                                <FormControl componentClass="select"
                                             value={this.getSeriesToNormaliseOn(this.state, this.props.series)}
                                             onChange={this.handleNormalise}
                                             placeholder="select">
                                    <option key="disabled" value="-1">Disabled</option>
                                    {this.makeNormaliseOptions()}
                                </FormControl>
                            </FormGroup>
                        </Col>
                    </Row>
                    <Row>
                        <Col lgHidden={true} mdHidden={true} xs={6}>
                            {updateButton}{resetButton}
                        </Col>
                    </Row>
                </Well>
                <Row>
                    <Col>
                        <Chart pathCount={this.props.pathCount}
                               series={chartData}
                               config={chartConfig}/>
                    </Col>
                </Row>
            </div>
        );
    }
}
