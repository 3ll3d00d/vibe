import React, {Component} from "react";
import LogStepNumericInput from "./LogStepNumericInput";
import {Button, Tooltip, OverlayTrigger, Well, Row, Col, InputGroup} from "react-bootstrap";
import Chart from "./Chart";
import ToggleButton from 'react-toggle-button'
import FontAwesome from "react-fontawesome";

export default class ChartController extends Component {

    constructor(props) {
        super(props);
        let state = {
            minX: -1,
            maxX: -1,
            minY: -1,
            maxY: -1,
            xLog: true,
            yLog: true,
            dots: false
        };
        this.state = Object.assign(state, this.createChartConfig(state));
        this.handleMinX.bind(this);
        this.handleMaxX.bind(this);
        this.handleMinY.bind(this);
        this.handleMaxY.bind(this);
        this.handleLinLogChange.bind(this);
        this.handleDotsChange.bind(this);
        this.updateChartConfig.bind(this);
    }

    calculateRange(data) {
        const series = Object.keys(data);
        return {
            minX: Math.min(...series.map((s) => Math.min(...this.props.data[s].map(x => x.x)))),
            minY: Math.min(...series.map((s) => Math.min(...this.props.data[s].map(x => x.y)))),
            maxX: Math.max(...series.map((s) => Math.max(...this.props.data[s].map(x => x.x)))),
            maxY: Math.max(...series.map((s) => Math.max(...this.props.data[s].map(x => x.y))))
        };
    }

    createChartConfig(state) {
        const range = this.calculateRange(this.props.data);
        return {
            chartConfig: {
                x: [this.chooseValue('minX', state, range), this.chooseValue('maxX', state, range)],
                y: [this.chooseValue('minY', state, range), this.chooseValue('maxY', state, range)],
                xLog: state.xLog,
                yLog: state.yLog,
                showDots: state.dots
            }
        };
    }

    handleMinX = (value) => {
        this.setState({minX: value});
    };
    handleMaxX = (value) => {
        this.setState({maxX: value});
    };
    handleMinY = (value) => {
        this.setState({minY: value});
    };
    handleMaxY = (value) => {
        this.setState({maxY: value});
    };
    handleLinLogChange = (name) => {
        const key = `${name}Log`;
        this.setState((previousState, props) => {
            return {
                [key]: !previousState[key]
            };
        });
    };
    handleDotsChange = () => {
        this.setState((previousState, props) => {
            return {
                dots: !previousState.dots
            };
        });
    };

    updateChartConfig = () => {
        this.setState((previousState, props) => {
            return this.createChartConfig(previousState);
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

    render() {
        const range = this.calculateRange(this.props.data);
        const xRange = this.makeXFields(range);
        const yRange = this.makeYFields(range);
        const updateButton = <Button onClick={this.updateChartConfig}>Update</Button>;
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
                        <Col md={1} xsHidden={true}>{updateButton}</Col>
                    </Row>
                    <Row>
                        <Col lgHidden={true} mdHidden={true} xs={6}>{updateButton}</Col>
                    </Row>
                </Well>
                <Row>
                    <Col>
                        <Chart data={this.props.data}
                               config={this.state.chartConfig}/>
                    </Col>
                </Row>
            </div>
        );
    }
}
