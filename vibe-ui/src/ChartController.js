import React, {Component} from "react";
import LogStepNumericInput from "./LogStepNumericInput";
import {Button, Col, InputGroup, OverlayTrigger, Row, Tooltip, Well} from "react-bootstrap";
import Chart from "./Chart";
import ToggleButton from "react-toggle-button";
import FontAwesome from "react-fontawesome";

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
            minX: -1,
            maxX: -1,
            minY: -1,
            maxY: -1,
            xLog: true,
            yLog: true,
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
                yLog: state.yLog,
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
    handleLinLogChange = (name) => {
        const key = `${name}Log`;
        this.setState((previousState, props) => {
            return {[key]: !previousState[key]};
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
                <LogStepNumericInput value={this.chooseValue('maxY', this.state, range)} handler={this.handleMaxY}/>
                <LogStepNumericInput value={this.chooseValue('minY', this.state, range)} handler={this.handleMinY}/>
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
                <LogStepNumericInput value={this.chooseValue('minX', this.state, range)}
                                     handler={this.handleMinX}
                                     defaultPrecision={1}/>
                <LogStepNumericInput value={this.chooseValue('maxX', this.state, range)}
                                     handler={this.handleMaxX}
                                     defaultPrecision={1}/>
            </InputGroup>
        </OverlayTrigger>;
    }

    chooseValue(name, state, range) {
        return state[name] > -1 ? state[name] : range[name];
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.forceUpdate && (nextProps.forceUpdate !== this.props.forceUpdate)) {
            this.setState((previousState, props) => {
                return this.createChartConfig(previousState, nextProps.range);
            });
        }
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
                                          onToggle={() => this.handleLinLogChange("x")}/>
                            <ToggleButton activeLabel="dots"
                                          inactiveLabel="dots"
                                          value={this.state.dots}
                                          onToggle={this.handleDotsChange}/>
                            <ToggleButton activeLabel="y log"
                                          inactiveLabel="y lin"
                                          value={this.state.yLog}
                                          onToggle={() => this.handleLinLogChange("y")}/>
                        </Col>
                        <Col md={2} xs={4}>{yRange}</Col>
                        <Col md={1} xsHidden={true}>
                            {updateButton}{resetButton}
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
                        <Chart data={this.props.data} config={this.state.config}/>
                    </Col>
                </Row>
            </div>
        );
    }
}
