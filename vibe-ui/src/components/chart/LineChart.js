import React, {PureComponent} from "react";
import PropTypes from "prop-types";
import {Chart, Line} from "react-chartjs-2";
import {hexToRGBA, SERIES_COLOURS} from "../../constants";

export default class LineChart extends PureComponent {
    static propTypes = {
        series: PropTypes.array.isRequired,
        config: PropTypes.object.isRequired,
        chartExportHandler: PropTypes.func,
        customChartConfig: PropTypes.object
    };

    chartRef = {};

    state = {
        redraw: false
    };

    componentWillReceiveProps = (nextProps) => {
        if (this.props.config.xLog !== nextProps.config.xLog) {
            this.setState({redraw: true});
        }
    };

    toRGBA = (rgba) => {
        return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
    };

    suppressNthLabel = (n, delegate) => (dataLabel, index, values) => {
        if (index % n === 0) {
            if (delegate) {
                return delegate(dataLabel, index, values);
            } else {
                return dataLabel;
            }
        } else {
            return '';
        }
    };

    componentWillMount = () => {
        // required for png export as per https://github.com/chartjs/Chart.js/issues/2830
        Chart.plugins.register({
            beforeDraw: (chartInstance) => {
                const ctx = chartInstance.chart.ctx;
                ctx.fillStyle = this.props.customChartConfig ? this.toRGBA(this.props.customChartConfig.colours.background) : 'white';
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
    static generateRandomColour() {
        return '#' + ~~(Math.random() * (1 << 24)).toString(16);
    }

    propagateExportableChart = (anim) => {
        const {height, width} = this.chartRef.chartInstance;
        const url = this.chartRef.chartInstance.toBase64Image();
        if (this.props.chartExportHandler) {
            this.props.chartExportHandler({height, width, url});
        }
    };

    render() {
        const {customChartConfig} = this.props;
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
            if (!colour) colour = LineChart.generateRandomColour();
            const dataset = {
                label: s.id + '/' + s.series,
                data: s.xyz,
                pointRadius: this.props.config.showDots ? (customChartConfig ? customChartConfig.dotSize : 1) : 0,
                borderColor: colour,
                backgroundColor: hexToRGBA(colour, 2),
                borderWidth: customChartConfig ? customChartConfig.lineWidth : 1,
                lineTension: customChartConfig ? customChartConfig.lineTension : 0.4,
                fill: customChartConfig ? (customChartConfig.lineFill ? 'bottom' : false) : false
            };
            if (s.renderMetaData) {
                return Object.assign(dataset, s.renderMetaData);
            } else {
                return dataset;
            }
        });
        let textColour = '#666';
        if (customChartConfig) {
            const fontColor = customChartConfig.colours.text;
            textColour = `rgba(${fontColor.r}, ${fontColor.g}, ${fontColor.b}, ${fontColor.a})`;
        }
        // x ticks
        const xLinLog = this.props.config.xLog ? "logarithmic" : "linear";
        let xAxisTicks = {fontColor: textColour, beginAtZero: false};
        if (this.props.config.xOverrideRange) {
            xAxisTicks = Object.assign(xAxisTicks, {min: this.props.config.x[0], max: this.props.config.x[1]});
        }
        // apply a default step size if we have a linear x axis
        if (!this.props.config.xLog && !this.props.config.xStep) {
            xAxisTicks = Object.assign(xAxisTicks, {stepSize: 5});
            const steps = ((this.props.config.x[1] - this.props.config.x[0]) / 5);
            if (steps > 30) {
                xAxisTicks = Object.assign(xAxisTicks, {
                    callback: this.suppressNthLabel(2, this.props.config.xFormatter)
                });
            } else {
                if (this.props.config.xFormatter) {
                    xAxisTicks = Object.assign(xAxisTicks, {callback: this.props.config.xFormatter});
                } else {
                    xAxisTicks = Object.assign(xAxisTicks, {callback: (a,b,c) => a});
                }
            }
        } else if (this.props.config.xFormatter) {
            xAxisTicks = Object.assign(xAxisTicks, {callback: this.props.config.xFormatter});
        }
        if (this.props.config.xStep) {
            xAxisTicks = Object.assign(xAxisTicks, {stepSize: this.props.config.xStep});
        }
        // y ticks
        const yLinLog = this.props.config.yLog ? "logarithmic" : "linear";
        let yAxisTicks = {fontColor: textColour};
        if (this.props.config.yOverrideRange) {
            yAxisTicks = Object.assign(yAxisTicks, {min: this.props.config.y[0], max: this.props.config.y[1]});
        }
        if (customChartConfig && customChartConfig.yStep > 0) {
            yAxisTicks = Object.assign(yAxisTicks, {stepSize: customChartConfig.yStep});
        } else if (this.props.config.yStep) {
            yAxisTicks = Object.assign(yAxisTicks, {stepSize: this.props.config.yStep});
        }
        if (this.props.config.yFormatter) {
            yAxisTicks = Object.assign(yAxisTicks, {callback: this.props.config.yFormatter});
        }
        // animation
        let animation = {duration: 750};
        if (this.props.chartExportHandler) {
            animation = Object.assign(animation, {onComplete: this.propagateExportableChart});
        }
        // dimensions and font size
        let divSize = {};
        const customDims = customChartConfig
            && customChartConfig.hasOwnProperty("height")
            && customChartConfig.height > 0
            && customChartConfig.hasOwnProperty("width")
            && customChartConfig.width > 0;
        let fontSize = 12;
        if (customDims) {
            divSize = {height: customChartConfig.height, width: customChartConfig.width};
            if (Math.max(divSize.width, divSize.height) >= 4000) {
                fontSize = 20;
            } else if (Math.max(divSize.width, divSize.height) >= 3000) {
                fontSize = 18;
            } else if (Math.max(divSize.width, divSize.height) >= 2000) {
                fontSize = 16;
            } else if (Math.max(divSize.width, divSize.height) >= 1000) {
                fontSize = 14;
            }
            xAxisTicks = Object.assign(xAxisTicks, {fontSize: fontSize});
            yAxisTicks = Object.assign(yAxisTicks, {fontSize: fontSize});
        }
        // grid
        let gridColour = {};
        if (customChartConfig) {
            const colour = customChartConfig.colours.gridlines;
            gridColour = {gridLines: {color: `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${colour.a})`}};
        }
        // title
        let title = {};
        if (customChartConfig && customChartConfig.title.text) {
            title = Object.assign(customChartConfig.title, {
                fontColor: textColour,
                position: 'top',
                display: 'true'
            });
        }
        // legend
        let legend = {
            position: 'bottom',
            fontSize: fontSize,
            fontColor: textColour
        };
        if (customChartConfig && !customChartConfig.legend) {
            legend = Object.assign(legend, {display: false});
        }
        const options = {
            scales: {
                xAxes: [
                    Object.assign({
                        type: xLinLog,
                        position: 'bottom',
                        ticks: xAxisTicks,
                        scaleLabel: {
                            display: true,
                            labelString: this.props.config.xLabel,
                            fontSize: fontSize,
                            fontColor: textColour
                        }
                    }, gridColour)
                ],
                yAxes: [
                    Object.assign({
                        type: yLinLog,
                        ticks: yAxisTicks,
                        scaleLabel: {
                            display: true,
                            labelString: this.props.config.yLabel,
                            fontSize: fontSize,
                            fontColor: textColour
                        }
                    }, gridColour)
                ]
            },
            legend: legend,
            animation: animation,
            responsive: true,
            title: title
        };
        return (
            <div style={Object.assign({position: "relative"}, divSize)} className='mt-3 mr-4'>
                <Line ref={(reference) => this.chartRef = reference }
                      type={'line'}
                      data={{datasets: datasets}}
                      options={options}
                      redraw={this.state.redraw}/>
            </div>
        );
    }
}