import PathSeries from "../PathSeries";

test('a series has a name', () => {
    const series = new PathSeries('test');
    expect(series.seriesName).toBe('test');
    expect(series.visible).toBeTruthy();
    expect(series.rendered).toBeNull();
    expect(series.normalisedData).not.toBeNull();
    expect(series.normalisedData.count()).toBe(0);
});

test('a series accepts data', () => {
    const series = new PathSeries('test');
    expect(series.seriesName).toBe('test');
    expect(series.visible).toBeTruthy();
    expect(series.rendered).toBeNull();
    expect(series.normalisedData).not.toBeNull();
    expect(series.normalisedData.count()).toBe(0);

    const data = {
        val: [-1,2,-3,4,5],
        freq: [11,12,13,14,15]
    };
    const withData = series.acceptData(data);
    expect(withData).not.toBe(series);
    expect(series.normalisedData.count()).toBe(0);
    expect(withData.rendered).not.toBeNull();
    expect(withData.rendered.minX).toBe(11);
    expect(withData.rendered.maxX).toBe(15);
    expect(withData.rendered.minY).toBe(-3);
    expect(withData.rendered.maxY).toBe(5);
    expect(withData.rendered.xyz).not.toBeNull();
    expect(withData.rendered.xyz).toHaveLength(5);

    for (let [index, value] of data.freq.entries()) {
        expect(withData.rendered.xyz[index].x).toBe(value);
        expect(withData.rendered.xyz[index].y).toBe(data.val[index]);
        expect(withData.rendered.xyz[index].z).toBe(1);
    }
    // repeated calls are nops
    const idempotentCall = withData.acceptData(data);
    expect(idempotentCall).toBe(withData);
});

test('fresh data does not trigger recalulation', () => {
    const series = new PathSeries('test');
    expect(series.seriesName).toBe('test');
    expect(series.visible).toBeTruthy();
    expect(series.rendered).toBeNull();
    expect(series.normalisedData).not.toBeNull();
    expect(series.normalisedData.count()).toBe(0);

    const data = {
        val: [-1,2,-3,4,5],
        freq: [11,12,13,14,15]
    };
    const withData = series.acceptData(data);
    expect(withData).not.toBe(series);
    expect(series.normalisedData.count()).toBe(0);
    expect(withData.rendered).not.toBeNull();
    expect(withData.acceptData(data)).toBe(withData);
    expect(withData.acceptData(data)).toBe(withData);
    expect(withData.acceptData(data)).toBe(withData);
    expect(withData.acceptData(data)).toBe(withData);
});

test('data can be normalised', () => {
    const series = new PathSeries('test');
    expect(series.seriesName).toBe('test');
    expect(series.visible).toBeTruthy();
    expect(series.rendered).toBeNull();
    expect(series.normalisedData).not.toBeNull();
    expect(series.normalisedData.count()).toBe(0);

    const data = {
        val: [-1,2,-3,4,5],
        freq: [11,12,13,14,15]
    };
    const seriesWithData = series.acceptData(data);
    expect(seriesWithData).not.toBe(series);
    expect(seriesWithData.rendered).not.toBeNull();
    expect(seriesWithData.rendered.minX).toBe(11);
    expect(seriesWithData.rendered.maxX).toBe(15);
    expect(seriesWithData.rendered.minY).toBe(-3);
    expect(seriesWithData.rendered.maxY).toBe(5);
    expect(seriesWithData.rendered.xyz).not.toBeNull();
    expect(seriesWithData.rendered.xyz).toHaveLength(5);

    for (let [index, value] of data.freq.entries()) {
        expect(seriesWithData.rendered.xyz[index].x).toBe(value);
        expect(seriesWithData.rendered.xyz[index].y).toBe(data.val[index]);
        expect(seriesWithData.rendered.xyz[index].z).toBe(1);
    }

    const refSeries = new PathSeries('ref');
    expect(refSeries.seriesName).toBe('ref');
    expect(refSeries.visible).toBeTruthy();
    expect(refSeries.rendered).toBeNull();
    expect(refSeries.normalisedData).not.toBeNull();
    expect(refSeries.normalisedData.count()).toBe(0);

    const referenceData = {
        val: [-2,4,-9,8,11],
        freq: [11,12,13,14,15]
    };
    const refSeriesWithData = refSeries.acceptData(referenceData);
    expect(refSeriesWithData).not.toBe(refSeries);
    expect(refSeriesWithData.rendered).not.toBeNull();
    expect(refSeriesWithData.rendered.minX).toBe(11);
    expect(refSeriesWithData.rendered.maxX).toBe(15);
    expect(refSeriesWithData.rendered.minY).toBe(-9);
    expect(refSeriesWithData.rendered.maxY).toBe(11);
    expect(refSeriesWithData.rendered.xyz).not.toBeNull();
    expect(refSeriesWithData.rendered.xyz).toHaveLength(5);

    for (let [index, value] of referenceData.freq.entries()) {
        expect(refSeriesWithData.rendered.xyz[index].x).toBe(value);
        expect(refSeriesWithData.rendered.xyz[index].y).toBe(referenceData.val[index]);
        expect(refSeriesWithData.rendered.xyz[index].z).toBe(1);
    }

    const withReference = seriesWithData.normalise('ref', refSeriesWithData.rendered);
    expect(withReference.rendered).not.toBeNull();
    expect(withReference.rendered.minX).toBe(11);
    expect(withReference.rendered.maxX).toBe(15);
    expect(withReference.rendered.minY).toBe(-3);
    expect(withReference.rendered.maxY).toBe(5);
    expect(withReference.rendered.xyz).not.toBeNull();
    expect(withReference.rendered.xyz).toHaveLength(5);
    for (let [index, value] of data.freq.entries()) {
        expect(withReference.rendered.xyz[index].x).toBe(value);
        expect(withReference.rendered.xyz[index].y).toBe(data.val[index]);
        expect(withReference.rendered.xyz[index].z).toBe(1);
    }
    expect(withReference.normalisedData.count()).toBe(1);
    const normalised = withReference.normalisedData.get('ref');
    expect(normalised).not.toBeNull();
    expect(normalised.minX).toBe(11);
    expect(normalised.maxX).toBe(15);
    expect(normalised.minY).toBe(-6);
    expect(normalised.maxY).toBe(6);
    expect(normalised.xyz).not.toBeNull();
    expect(normalised.xyz).toHaveLength(5);
    const expectedReferenceVals = [1, -2, 6, -4, -6];
    for (let [index, value] of data.freq.entries()) {
        expect(normalised.xyz[index].x).toBe(value);
        expect(normalised.xyz[index].y).toBe(expectedReferenceVals[index]);
        expect(normalised.xyz[index].z).toBe(1);
    }
    expect(withReference.normalise('ref', refSeriesWithData.rendered)).toBe(withReference);
    expect(withReference.normalise('ref', refSeriesWithData.rendered)).toBe(withReference);
    expect(withReference.normalise('ref', refSeriesWithData.rendered)).toBe(withReference);
});

test('data can be normalised to itself', () => {
    const series = new PathSeries('test');
    expect(series.seriesName).toBe('test');
    expect(series.visible).toBeTruthy();
    expect(series.rendered).toBeNull();
    expect(series.normalisedData).not.toBeNull();
    expect(series.normalisedData.count()).toBe(0);

    const data = {
        val: [-1,2,-3,4,5],
        freq: [11,12,13,14,15]
    };
    const seriesWithData = series.acceptData(data);
    expect(seriesWithData).not.toBe(series);
    expect(seriesWithData.rendered).not.toBeNull();
    expect(seriesWithData.rendered.minX).toBe(11);
    expect(seriesWithData.rendered.maxX).toBe(15);
    expect(seriesWithData.rendered.minY).toBe(-3);
    expect(seriesWithData.rendered.maxY).toBe(5);
    expect(seriesWithData.rendered.xyz).not.toBeNull();
    expect(seriesWithData.rendered.xyz).toHaveLength(5);

    for (let [index, value] of data.freq.entries()) {
        expect(seriesWithData.rendered.xyz[index].x).toBe(value);
        expect(seriesWithData.rendered.xyz[index].y).toBe(data.val[index]);
        expect(seriesWithData.rendered.xyz[index].z).toBe(1);
    }

    const withReference = seriesWithData.normalise('ref', seriesWithData.rendered);
    expect(withReference.rendered).not.toBeNull();
    expect(withReference.rendered.minX).toBe(11);
    expect(withReference.rendered.maxX).toBe(15);
    expect(withReference.rendered.minY).toBe(-3);
    expect(withReference.rendered.maxY).toBe(5);
    expect(withReference.rendered.xyz).not.toBeNull();
    expect(withReference.rendered.xyz).toHaveLength(5);
    for (let [index, value] of data.freq.entries()) {
        expect(withReference.rendered.xyz[index].x).toBe(value);
        expect(withReference.rendered.xyz[index].y).toBe(data.val[index]);
        expect(withReference.rendered.xyz[index].z).toBe(1);
    }
    expect(withReference.normalisedData.count()).toBe(1);
    const normalised = withReference.normalisedData.get('ref');
    expect(normalised).not.toBeNull();
    expect(normalised.minX).toBe(11);
    expect(normalised.maxX).toBe(15);
    expect(normalised.minY).toBeCloseTo(0);
    expect(normalised.maxY).toBeCloseTo(0);
    expect(normalised.xyz).not.toBeNull();
    expect(normalised.xyz).toHaveLength(5);
    for (let [index, value] of data.freq.entries()) {
        expect(normalised.xyz[index].x).toBe(value);
        expect(normalised.xyz[index].y).toBe(0);
        expect(normalised.xyz[index].z).toBe(1);
    }
});
