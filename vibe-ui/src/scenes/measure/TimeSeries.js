import React, {Component} from "react";
import PropTypes from "prop-types";
import {Card, Nav} from "react-bootstrap";
import LineChart from "../../components/chart/LineChart";
import Message from "../../components/Message";

export default class TimeSeries extends Component {
    static propTypes = {
        measurementId: PropTypes.string.isRequired,
        dataPromise: PropTypes.object.isRequired,
        fs: PropTypes.number.isRequired
    };

    static idxToSeriesName = {
        "1": "raw",
        "2": "vibration",
        "3": "tilt"
    };

    state = {selected: "2"};

    /**
     * Only update if the view has changed or the measurement has changed.
     * @param nextProps
     * @param nextState
     * @returns {boolean}
     */
    shouldComponentUpdate = (nextProps, nextState) => {
        return nextState.selected !== this.state.selected ||  nextProps.measurementId !== this.props.measurementId;
    };

    /**
     * Controls which graph to display.
     * @param key
     */
    selectChart = (key) => {
        this.setState({selected: key});
    };

    asChartData(device, series, axis, data) {
        const raw = data[device][series][axis];
        let xyz = [];
        let minX = Number.MAX_SAFE_INTEGER;
        let minY = Number.MAX_SAFE_INTEGER;
        let maxX = Number.MIN_SAFE_INTEGER;
        let maxY = Number.MIN_SAFE_INTEGER;
        for (let [idx, value] of raw.entries()) {
            xyz.push({x: idx / this.props.fs, y: raw[idx], z: 1});
            if (value < minX) minX = value;
            if (value > maxX) maxX = value;
            if (raw[idx] < minY) minY = raw[idx];
            if (raw[idx] > maxY) maxY = raw[idx];
        }
        return {
            id: `${device}/${series}`,
            series: axis,
            seriesIdx: 1,
            xyz: xyz,
            minX: minX,
            maxX: maxX,
            minY: minY,
            maxY: maxY
        };
    }

    renderSelectedMeasurementAsChartData() {
        const data = this.props.dataPromise.value;
        const series = TimeSeries.idxToSeriesName[this.state.selected];
        const output = Object.keys(data).map((device) => {
            if (data[device].hasOwnProperty(series)) {
                return Object.keys(data[device][series]).map(axis => this.asChartData(device, series, axis, data));
            } else {
                return null;
            }
        });
        return [].concat(...output).filter(o => o !== null);
    }

    calculateXRange(series) {
        return [Math.min(...series.map(s => s.minX)), Math.max(...series.map(s => s.maxX))];
    }

    calculateYRange(series) {
        return [Math.min(...series.map(s => s.minY)), Math.max(...series.map(s => s.maxY))];
    }

    getChartConfig(series) {
        return {
            x: this.calculateXRange(series),
            xLabel: 'time (s)',
            xLog: false,
            y: this.calculateYRange(series),
            yLog: false,
            yLabel: '',
            showDots: false
        };
    }

    render() {
        if (this.props.dataPromise) {
            if (this.props.dataPromise.fulfilled) {
                const series = this.renderSelectedMeasurementAsChartData();
                const navs = Object.keys(TimeSeries.idxToSeriesName).map(k =>
                    <Nav.Item key={k}>
                        <Nav.Link eventKey={k}>{TimeSeries.idxToSeriesName[k]}</Nav.Link>
                    </Nav.Item>
                );
                if (series.length > 0) {
                    const config = this.getChartConfig(series);
                    return (
                        <div>
                            <Card>
                                <Card.Header>
                                    <Nav variant="tabs" activeKey={this.state.selected} onSelect={this.selectChart}>
                                        {navs}
                                    </Nav>
                                </Card.Header>
                                <LineChart series={series} config={config}/>
                            </Card>
                        </div>
                    );
                } else {
                    return (
                        <div>
                            <Nav variant="tabs" activeKey={this.state.selected} onSelect={this.selectChart}>
                                {navs}
                            </Nav>
                            <Message title="Failed to render data" type="danger"/>
                        </div>
                    );
                }
            } else if (this.props.dataPromise.rejected) {
                return <Message title="Unable to fetch data" type="danger"
                                message={this.props.dataPromise.reason.toString()}/>;
            } else if (this.props.dataPromise.pending) {
                return <Message type="info" message="Loading"/>;
            }
        } else {
            return <Message type="warning" title="Warning" message="No data available"/>;
        }
    }
}