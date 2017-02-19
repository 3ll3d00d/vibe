import React, {Component} from "react";
import LogStepNumericInput from "./LogStepNumericInput";
import {Button, Tooltip, OverlayTrigger, Grid, Row, Col, InputGroup} from "react-bootstrap";
import Chart from "./Chart";
import ToggleButton from 'react-toggle-button'
import FontAwesome from "react-fontawesome";

export default class ChartController extends Component {

    constructor(props) {
        super(props);
        const x = this.props.data.x.map(x => x.x);
        const y = this.props.data.x.map(x => x.y);
        // this means user input is overwritten if the data changes, not an issue until we get to the RTA view
        let minX = Math.min(...x);
        let maxX = Math.max(...x);
        let minY = Math.min(...y);
        let maxY = Math.max(...y);
        let state = {
            minX: minX,
            maxX: maxX,
            minY: minY,
            maxY: maxY,
            xLog: true,
            yLog: true,
            dots: false
        };
        state = Object.assign(state, ...this.extractSeries().map((s) => {
            return {[`show${s}`]: true}
        }));
        this.state = Object.assign(state, this.createChartConfig(state));
        this.handleMinX.bind(this);
        this.handleMaxX.bind(this);
        this.handleMinY.bind(this);
        this.handleMaxY.bind(this);
        this.handleLinLogChange.bind(this);
        this.handleDotsChange.bind(this);
        this.updateChartConfig.bind(this);
    }

    extractSeries() {
        return Object.keys(this.props.data);
    }

    createChartConfig(state) {
        const seriesToShow = this.extractSeries().map((s) => {
            if (state[`show${s}`]) return s;
            else return null;
        }).filter((s) => s !== null);
        return {
            chartConfig: {
                x: [state.minX, state.maxX],
                y: [state.minY, state.maxY],
                xLog: state.xLog,
                yLog: state.yLog,
                showDots: state.dots,
                series: seriesToShow
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

    makeYFields() {
        const yTip = <Tooltip id={"y"}>Y Axis Range</Tooltip>;
        return <OverlayTrigger placement="top" overlay={yTip} trigger="click" rootClose>
            <InputGroup bsSize="small">
                <InputGroup.Addon>
                    <FontAwesome name="arrows-v"/>
                </InputGroup.Addon>
                <LogStepNumericInput value={this.state.maxY} handler={this.handleMaxY}/>
                <LogStepNumericInput value={this.state.minY} handler={this.handleMinY}/>
            </InputGroup>
        </OverlayTrigger>;
    }

    makeXFields() {
        const xTip = <Tooltip id={"x"}>X Axis Range</Tooltip>;
        return <OverlayTrigger placement="top" overlay={xTip} trigger="click" rootClose>
            <InputGroup>
                <InputGroup.Addon>
                    <FontAwesome name="arrows-h"/>
                </InputGroup.Addon>
                <LogStepNumericInput value={this.state.minX} handler={this.handleMinX}
                                     defaultPrecision={1}/>
                <LogStepNumericInput value={this.state.maxX} handler={this.handleMaxX}
                                     defaultPrecision={1}/>
            </InputGroup>
        </OverlayTrigger>;
    }

    render() {
        const xRange = this.makeXFields();
        const yRange = this.makeYFields();
        const updateButton = <Button onClick={this.updateChartConfig}>Update</Button>;
        return (
            <Grid>
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
                <Row>
                    <Col>
                        <Chart data={this.props.data}
                               chartConfig={this.state.chartConfig}/>
                    </Col>
                </Row>
            </Grid>
        );
    }
}
