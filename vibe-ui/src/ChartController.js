import React, {Component} from "react";
import LogStepNumericInput from "./LogStepNumericInput";
import {Button, Tooltip, OverlayTrigger, Grid, Row, Col, InputGroup, Glyphicon} from "react-bootstrap";
import Chart from "./Chart";
import Toggle from 'react-toggle';
import 'react-toggle/style.css';

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
            series: ['x', 'y', 'z']
        };
        state = Object.assign(state, ...state.series.map((s) => {
            return {[`show${s}`]: true}
        }));
        this.state = Object.assign(state, this.createChartConfig(state));
        this.handleMinX.bind(this);
        this.handleMaxX.bind(this);
        this.handleMinY.bind(this);
        this.handleMaxY.bind(this);
        this.updateChartConfig.bind(this);
    }

    createChartConfig(state) {
        const seriesToShow = state.series.map((s) => {
            if (state[`show${s}`]) return s;
            else return null;
        }).filter((s) => s !== null);
        return {
            chartConfig: {
                x: [state.minX, state.maxX],
                y: [state.minY, state.maxY],
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
    handleSeriesChange = (name) => {
        const key = `show${name}`;
        this.setState((previousState, props) => {
            return {
                [key]: !previousState[key]
            };
        });
    };
    updateChartConfig = () => {
        this.setState((previousState, props) => {
            return this.createChartConfig(previousState);
        });
    };

    render() {
        const xTip = <Tooltip id={"x"}>X Axis Range</Tooltip>;
        const yTip = <Tooltip id={"y"}>Y Axis Range</Tooltip>;
        const toggles = this.state.series.map((name) => {
            return <ShowSeriesToggle key={name} name={name} show={this.state[`show${name}`]}
                                     handler={() => this.handleSeriesChange(name)}/>
        });
        return (
            <Grid>
                <Row>
                    <Col md={3}>
                        <OverlayTrigger placement="top" overlay={xTip} trigger="click" rootClose>
                            <InputGroup>
                                <InputGroup.Addon>
                                    <Glyphicon glyph="glyphicon glyphicon-resize-horizontal"/>
                                </InputGroup.Addon>
                                <LogStepNumericInput value={this.state.minX} handler={this.handleMinX}/>
                                <LogStepNumericInput value={this.state.maxX} handler={this.handleMaxX}/>
                            </InputGroup>
                        </OverlayTrigger>
                    </Col>
                    <Col md={3}>
                        <OverlayTrigger placement="top" overlay={yTip} trigger="click" rootClose>
                            <InputGroup>
                                <InputGroup.Addon>
                                    <Glyphicon glyph="glyphicon glyphicon-resize-vertical"/>
                                </InputGroup.Addon>
                                <LogStepNumericInput value={this.state.minY} handler={this.handleMinY}/>
                                <LogStepNumericInput value={this.state.maxY} handler={this.handleMaxY}/>
                            </InputGroup>
                        </OverlayTrigger>
                    </Col>
                    <Col md={2}>
                        {toggles}
                    </Col>
                    <Col md={1}>
                        <Button onClick={this.updateChartConfig}>Update</Button>
                    </Col>
                </Row>
                <Row>
                    <Col md={12}>
                        <Chart data={this.props.data}
                               chartConfig={this.state.chartConfig}/>
                    </Col>
                </Row>
            </Grid>
        );
    }
}

class ShowSeriesToggle extends Component {
    render() {
        return (
            <div>
                <Toggle
                    id={this.props.name}
                    defaultChecked={this.props.show}
                    onChange={this.props.handler}/>
                <label htmlFor={this.props.name}>{this.props.name}</label>
            </div>
        );
    }
}