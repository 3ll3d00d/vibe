import React, {PropTypes, PureComponent} from "react";
import {Line} from "./ChartJS";
import {hexToRGBA, SERIES_COLOURS} from "../../constants";

export default class Chart extends PureComponent {
    static propTypes = {
        series: PropTypes.array.isRequired,
        config: PropTypes.object.isRequired,
    };

    // credit to https://www.paulirish.com/2009/random-hex-color-code-snippets/
    generateRandomColour() {
        return '#' + ~~(Math.random() * (1 << 24)).toString(16);
    }

    render() {
        const datasets = this.props.series.map((s) => {
            let colour;
            if (SERIES_COLOURS[s.series]) {
                if (s.seriesIdx < SERIES_COLOURS[s.series].length) {
                    colour = SERIES_COLOURS[s.series][s.seriesIdx];
                }
            } else {
                if (s.seriesIdx < SERIES_COLOURS.unknown.length) {
                    colour = SERIES_COLOURS.unknown[s.seriesIdx];
                }
            }
            if (!colour) colour = this.generateRandomColour();
            return {
                label: s.id + '/' + s.series,
                data: s.xyz,
                pointRadius: this.props.config.showDots ? 1 : 0,
                borderColor: colour,
                backgroundColor: hexToRGBA(colour, 2),
                borderWidth: 1
            };
        });
        const xLinLog = this.props.config.xLog ? "logarithmic" : "linear";
        let xAxisTicks = {};
        if (this.props.config.xOverrideRange) {
            xAxisTicks = Object.assign(xAxisTicks, {min: this.props.config.x[0], max: this.props.config.x[1]});
        }
        if (this.props.config.xStep) {
            xAxisTicks = Object.assign(xAxisTicks, {stepSize: this.props.config.xStep});
        }
        if (this.props.config.xFormatter) {
            xAxisTicks = Object.assign(xAxisTicks, {callback: this.props.config.xFormatter});
        }

        const yLinLog = this.props.config.yLog ? "logarithmic" : "linear";
        let yAxisTicks = {};
        if (this.props.config.yOverrideRange) {
            yAxisTicks = Object.assign(yAxisTicks, {min: this.props.config.y[0], max: this.props.config.y[1]});
        }
        if (this.props.config.yStep) {
            yAxisTicks = Object.assign(yAxisTicks, {stepSize: this.props.config.yStep});
        }
        if (this.props.config.yFormatter) {
            yAxisTicks = Object.assign(yAxisTicks, {callback: this.props.config.yFormatter});
        }
        const options = {
            scales: {
                xAxes: [{
                    type: xLinLog,
                    position: 'bottom',
                    ticks: xAxisTicks,
                    scaleLabel: {
                        display: true,
                        labelString: this.props.config.xLabel
                    }
                }],
                yAxes: [{
                    type: yLinLog,
                    ticks: yAxisTicks,
                    scaleLabel: {
                        display: true,
                        labelString: this.props.config.yLabel
                    }
                }]
            },
            legend: {
                position: 'bottom'
            },
            responsive: true,
            animation: {
                duration: 750
            }
        };
        return <Line ref='chart'
                     type={'line'}
                     data={{datasets: datasets}}
                     options={options}/>;
    }
}