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
import LineChart from "../../components/chart/LineChart";
import PreciseIntNumericInput from "./PreciseIntNumericInput";
import {NO_OPTION_SELECTED} from "../../constants";

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
        return {
            config: {
                x: [this.chooseValue('minX', state, range), this.chooseValue('maxX', state, range)],
                y: [this.chooseValue('minY', state, range), this.chooseValue('maxY', state, range)],
                xLog: state.xLog,
                showDots: state.dots
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
     * Creates a reference series selector if we have >1 series in the chart.
     * @returns {*}
     */
    makeReferenceSeriesSelector() {
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
        } else {
            return null;
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
                            {this.makeReferenceSeriesSelector()}
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
                        <LineChart pathCount={this.props.pathCount}
                               series={this.props.series}
                               config={this.state.config}/>
                    </Col>
                </Row>
            </div>
        );
    }
}
