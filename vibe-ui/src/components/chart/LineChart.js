import React, {PureComponent} from "react";
import PropTypes from "prop-types";
import {Chart, Line} from "react-chartjs-2";
import {hexToRGBA, SERIES_COLOURS} from "../../constants";

export default class LineChart extends PureComponent {
    static propTypes = {
        series: PropTypes.array.isRequired,
        config: PropTypes.object.isRequired,
        chartExportHandler: PropTypes.func,
        customChartDimensions: PropTypes.object
    };

    state = {
        redraw: false
    };

    componentWillReceiveProps = (nextProps) => {
        if (this.props.config.xLog !== nextProps.config.xLog) {
            this.setState({redraw: true});
        }
        if (nextProps.customChartDimensions && !this.props.customChartDimensions) {
            this.setState({redraw: true});
        }
        if (nextProps.customChartDimensions && this.props.customChartDimensions) {
            if (nextProps.customChartDimensions.width !== this.props.customChartDimensions.width
                || nextProps.customChartDimensions.height !== this.props.customChartDimensions.height) {
                this.setState({redraw: true});
            }
        }
    };

    componentWillMount = () => {
        // required for png export as per https://github.com/chartjs/Chart.js/issues/2830
        Chart.plugins.register({
            beforeDraw: (chartInstance) => {
                const ctx = chartInstance.chart.ctx;
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, chartInstance.chart.width, chartInstance.chart.height);
            }
        });
    };

    componentDidUpdate = (prevProps, prevState) => {
        if (this.state.redraw) {
            this.setState({redraw: false});
        }
    };

    // credit to https://www.paulirish.com/2009/random-hex-color-code-snippets/
    generateRandomColour() {
        return '#' + ~~(Math.random() * (1 << 24)).toString(16);
    }

    propagateExportableChart = (anim) => {
        const {height, width} = this.refs.chart.chart_instance.chart;
        const url = this.refs.chart.chart_instance.toBase64Image();
        if (this.props.chartExportHandler) {
            this.props.chartExportHandler({height, width, url});
        }
    };

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
            const dataset = {
                label: s.id + '/' + s.series,
                data: s.xyz,
                pointRadius: this.props.config.showDots ? 1 : 0,
                borderColor: colour,
                backgroundColor: hexToRGBA(colour, 2),
                borderWidth: 1,
            };
            if (s.renderMetaData) {
                return Object.assign(dataset, s.renderMetaData);
            } else {
                return dataset;
            }
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
        let animation = {duration: 750};
        if (this.props.chartExportHandler) {
            animation = Object.assign(animation, {onComplete: this.propagateExportableChart});
        }
        let divSize = {};
        const customDims = this.props.customChartDimensions
            && this.props.customChartDimensions.hasOwnProperty("height")
            && this.props.customChartDimensions.height > 0
            && this.props.customChartDimensions.hasOwnProperty("width")
            && this.props.customChartDimensions.width > 0;
        if (customDims) {
            divSize = {height: this.props.customChartDimensions.height, width: this.props.customChartDimensions.width};
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
            animation: animation,
            responsive: true
        };
        return (
            <div style={Object.assign({position: "relative"}, divSize)}>
                <Line ref='chart'
                             type={'line'}
                             data={{datasets: datasets}}
                             options={options}
                             redraw={this.state.redraw}/>;
            </div>
        );
    }
}