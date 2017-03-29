import React, {Component, PropTypes} from "react";
import {Panel} from "react-bootstrap";
import LineChart from "../../components/chart/LineChart";

export default class TargetCurve extends Component {
    static propTypes = {
        data: PropTypes.object.isRequired
    };

    asChartData() {
        let xyz = [];
        if (this.props.data.hinge) {
            xyz = this.props.data.hinge.map(d => {return {x: d[1], y: d[0], z: 1}});
        }
        return {
            // TODO remove the distinction between id and series
            id: this.props.data.name,
            series: '',
            seriesIdx: 1,
            xyz: xyz,
            minX: Math.min(...xyz.map(val => val.x)),
            maxX: Math.max(...xyz.map(val => val.x)),
            minY: Math.min(...xyz.map(val => val.y)),
            maxY: Math.max(...xyz.map(val => val.y)),
            renderMetaData: {
                lineTension: 0
            }
        };
    }

    getChartConfig(series) {
        return {
            x: [Math.floor(series.minX), Math.ceil(series.maxX)],
            xLabel: 'Frequency (Hz)',
            xLog: true,
            xFormatter: (value, index, values) => Math.round(value),
            y: [Math.floor(series.minY), Math.ceil(series.maxY)],
            yLog: false,
            yLabel: '',
            showDots: false
        };
    }

    render() {
        const series = this.asChartData();
        const config = this.getChartConfig(series);
        return (
            <Panel>
                <LineChart series={[series]} config={config}/>
            </Panel>
        );
    }
}