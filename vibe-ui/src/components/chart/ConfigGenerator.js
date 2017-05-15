export const getAnalysisChartConfig = (inputXRange, inputYRange, xLogScale, showDots) => {
    const yRange = Math.floor(inputYRange[1] - inputYRange[0]);
    let yStep = 5;
    if (yRange > 60) {
        yStep = Math.floor(yRange / 10);
    } else if (yRange < 1) {
        yStep = 0.1;
    } else if (yRange < 2) {
        yStep = 0.2;
    } else if (yRange < 5) {
        yStep = 0.5;
    } else if (yRange < 10) {
        yStep = 1;
    } else if (yRange < 20) {
        yStep = 2;
    }
    const minY = yStep * Math.floor(inputYRange[0] / yStep);
    const maxY = yStep * Math.ceil(inputYRange[1] / yStep);
    return {
        x: inputXRange,
        xLog: xLogScale,
        xLabel: 'Frequency (Hz)',
        xFormatter: (value, index, values) => {
            let formatted = Math.round(value);
            if (value >= 1000) {
                return (value / 1000) + 'k';
            } else if (value < 1) {
                return Math.round(value * 10) / 10;
            }
            return formatted;
        },
        xOverrideRange: true,
        y: [minY, maxY],
        yStep: yStep,
        yLog: false,
        yOverrideRange: true,
        showDots: showDots
    };
};