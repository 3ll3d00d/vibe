import React, {Component} from "react";
import PropTypes from "prop-types";
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
import LineChart from "./LineChart";
import PreciseIntNumericInput from "../../scenes/analyse/PreciseIntNumericInput";
import {NO_OPTION_SELECTED} from "../../constants";
import {getAnalysisChartConfig} from "./ConfigGenerator";

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
            dots: false
        };
        return Object.assign(state, this.createChartConfig(state, props.range));
    }

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
                        <ControlLabel>Reference Series:</ControlLabel>
                        <FormControl componentClass="select"
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

    render() {
        const xRange = this.makeXFields(this.props.range);
        const yRange = this.makeYFields(this.props.range);
        const updateButton = <Button onClick={this.renderChart} bsSize="small"><FontAwesome name="repeat"/></Button>;
        const resetButton = <Button onClick={this.resetChart} bsSize="small"><FontAwesome name="undo"/></Button>;
        const downloadButton = <Button href="#" bsSize="small"><FontAwesome name="download"/></Button>;
        return (
            <div>
                <Well bsSize="small">
                    <Row>
                        <Col lg={2} md={2} sm={4} xs={4}>{xRange}</Col>
                        <Col lg={1} md={1} sm={2} xs={2}>
                            <ToggleButton activeLabel="x log"
                                          inactiveLabel="x lin"
                                          value={this.state.xLog}
                                          onToggle={this.handleLinLogChange}/>
                            <ToggleButton activeLabel="dots"
                                          inactiveLabel="dots"
                                          value={this.state.dots}
                                          onToggle={this.handleDotsChange}/>
                        </Col>
                        <Col lg={2} md={2} sm={4} xs={4}>{yRange}</Col>
                        <Col lg={1} md={1} smHidden={true} xsHidden={true}>
                            {updateButton}{resetButton}{downloadButton}
                        </Col>
                        <Col lg={6} md={6} sm={8} xs={8}>
                            {this.makeReferenceSeriesSelector()}
                        </Col>
                    </Row>
                    <Row>
                        <Col lgHidden={true} mdHidden={true} sm={6} xs={6}>
                            {updateButton}{resetButton}{downloadButton}
                        </Col>
                    </Row>
                </Well>
                <Row>
                    <Col>
                        <LineChart series={this.props.series} config={this.state.config}/>
                    </Col>
                </Row>
            </div>
        );
    }
}
