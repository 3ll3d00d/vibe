import React, {PureComponent} from "react";
import {Line} from "./ChartJS";
import {hexToRGBA, SERIES_COLOURS} from "../../constants";

export default class Chartjs extends PureComponent {
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
        // TODO use this somewhere
        const minY = 5 * Math.floor(this.props.config.y[0]/5);
        const maxY = 5 * Math.ceil(this.props.config.y[1]/5);
        const yTicks = [...new Array((maxY - minY)/5).keys()].map(i => (i * 5) + minY);
        return <Line ref='chart'
                     type={'line'}
                     data={{datasets: datasets}}
                     options={{
                         scales: {
                             xAxes: [{
                                 type: xLinLog,
                                 position: 'bottom',
                                 ticks: {
                                     min: Math.round(this.props.config.x[0]),
                                     max: this.props.config.x[1],
                                     callback: (value, index, values) => Math.round(value)
                                 },
                                 scaleLabel: {
                                     display: true,
                                     labelString: "Frequency (Hz)"
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
                     }}/>;
    }
}