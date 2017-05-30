import React, {Component} from "react";
import PropTypes from "prop-types";
import Dropzone from "react-dropzone";
import {ListGroup, ListGroupItem, Panel, Table} from "react-bootstrap";
import {List, Map} from "immutable";
import FontAwesome from "react-fontawesome";
import {UPLOAD_CHUNK_SIZE} from "../../constants";
import UploadRecord from "./UploadRecord";
import {connect} from "react-refetch";
import UploadTable from "./UploadTable";
import Preview from "./Preview";
import PathSeries from "../../components/path/PathSeries";
import {DateTimeFormatter, LocalTime} from "js-joda";

class Upload extends Component {

    static contextTypes = {
        apiPrefix: PropTypes.string.isRequired
    };

    state = {
        uploaded: new List(),
        selectedChart: null,
        previewStarts: new Map(),
        previewEnds: new Map(),
        previewResolutions: new Map(),
        previewWindows: new Map()
    };

    showSeries = (name) => {
        this.setState((previousState, props) => {
            const {start, end} = this.calculateStartEnd(name, previousState);
            let resolution = 1;
            if (previousState.previewResolutions.has(name)) {
                resolution = previousState.previewResolutions.get(name);
            }
            let window = 'hann';
            if (previousState.previewWindows.has(name)) {
                window = previousState.previewWindows.get(name);
            }
            this.props.fetchAnalysis(name, start, end, resolution, window);
            return {selectedChart: name};
        });
    };

    calculateStartEnd = (name, state) => {
        let start = 'start';
        if (state.previewStarts.has(name)) {
            start = state.previewStarts.get(name);
        }
        let end = 'end';
        if (state.previewEnds.has(name)) {
            end = state.previewEnds.get(name);
        }
        return {start, end};
    };

    clearSeries = () => {
        this.setState({selectedChart: null});
    };

    postFile = (accepted, rejected) => {
        accepted.forEach(a => {
            const chunks = this.chunkify(a);
            let next = new UploadRecord(a, chunks.length);
            this.setState((previousState, props) => {
                return {uploaded: previousState.uploaded.filter(u => u.name !== next.name).unshift(next)};
            });
            chunks.forEach(c => this.postChunk(a.slice(c.start, c.end), c, chunks.length));
        });
    };

    chunkify = file => {
        let start = 0;
        const chunks = [];
        let chunkIndex = 0;
        while (start < file.size) {
            const end = Math.min(start + UPLOAD_CHUNK_SIZE, file.size);
            chunks.push({start: start, end: end, idx: chunkIndex += 1, name: file.name, totalSize: file.size});
            start = end;
        }
        return chunks;
    };

    onChunkLoadEvent = (xhr, metadata, chunkCount) => e => {
        if (xhr.readyState === 4) {
            this.setState((previousState, props) => {
                const {uploaded} = previousState;
                const upload = uploaded.get(0);
                if (xhr.status !== 200) {
                    upload.failChunk(metadata.idx, xhr.status, xhr.statusText);
                } else {
                    upload.completeChunk(metadata.idx, xhr.status);
                }
                if (upload.allChunksComplete()) {
                    this.finaliseUpload(metadata, chunkCount, upload.allChunksSuccessful(), xhr);
                }
                return {uploaded: uploaded};
            });
        }
    };

    onFinaliseLoadEvent = (finaliser) => e => {
        if (finaliser.readyState === 4) {
            this.setState((previousState, props) => {
                const {uploaded} = previousState;
                const upload = uploaded.get(0);
                if (finaliser.status === 200) {
                    upload.completeMerge();
                } else {
                    upload.failMerge(finaliser.statusText);
                }
                return {uploaded: uploaded};
            });
        }
    };

    onFinaliseErrorEvent = (finaliser) => e => {
        this.setState((previousState, props) => {
            const {uploaded} = previousState;
            const upload = uploaded.get(0);
            upload.failMerge(finaliser.statusText);
            return {uploaded: uploaded};
        });
    };

    finaliseUpload = (metadata, chunkCount, success) => {
        const finaliser = new XMLHttpRequest();
        finaliser.open("PUT", `${this.context.apiPrefix}/completeupload/${metadata.name}/${chunkCount}/${success}`, true);
        finaliser.onload = this.onFinaliseLoadEvent(finaliser);
        finaliser.onerror = this.onFinaliseErrorEvent(finaliser);
        finaliser.send();
    };

    onChunkProgressEvent = (xhr, metadata) => e => {
        if (e.lengthComputable) {
            const percentOfChunk = e.loaded / e.total;
            const totalInBytes = (percentOfChunk * (metadata.end - metadata.start));
            this.setState((previousState, props) => {
                const {uploaded} = previousState;
                uploaded.get(0).updateChunkProgress(metadata.idx, totalInBytes);
                return {uploaded: uploaded};
            });
        }
    };

    onChunkErrorEvent = (xhr, metadata, chunkCount) => e => {
        this.setState((previousState, props) => {
            const {uploaded} = previousState;
            uploaded.get(0).failChunk(metadata.idx, 1000, e);
            return {uploaded: uploaded};
        });
    };

    postChunk = (chunk, metadata, chunkCount) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", `${this.context.apiPrefix}/upload/${metadata.name}/${metadata.idx}/${chunkCount}`, true);
        xhr.overrideMimeType('binary/octet-stream');
        xhr.onload = this.onChunkLoadEvent(xhr, metadata, chunkCount);
        xhr.upload.addEventListener("progress", this.onChunkProgressEvent(xhr, metadata), false);
        xhr.onerror = this.onChunkErrorEvent(xhr, metadata, chunkCount);
        xhr.send(chunk);
    };

    getPreviewStart = (name) => {
        if (this.state.previewStarts.has(name)) {
            return this.state.previewStarts.get(name);
        }
        return '00:00:00.000';
    };

    getPreviewEnd = (name, duration) => {
        if (this.state.previewEnds.has(name)) {
            return this.state.previewEnds.get(name);
        }
        return duration;
    };

    getPreviewResolution = (name) => {
        if (this.state.previewResolutions.has(name)) {
            return this.state.previewResolutions.get(name);
        }
        return 1;
    };

    getPreviewWindow = (name) => {
        if (this.state.previewWindows.has(name)) {
            return this.state.previewWindows.get(name);
        }
        return 'hann';
    };

    setPreviewStart = (name) => (event) => {
        const val = event.target.value;
        this.setState((previousState, props) => {
            if (val === '00:00') {
                return {previewStarts: previousState.previewStarts.remove(name)}
            } else {
                return {previewStarts: previousState.previewStarts.set(name, val)}
            }
        });
    };

    setPreviewEnd = (name) => (event) => {
        const val = event.target.value;
        this.setState((previousState, props) => {
            if (val === '00:00') {
                return {previewEnds: previousState.previewEnds.remove(name)}
            } else {
                return {previewEnds: previousState.previewEnds.set(name, val)}
            }
        });
    };

    setPreviewResolution = (name) => (event) => {
        const val = event.target.value;
        this.setState((previousState, props) => {
            return {previewResolutions: previousState.previewResolutions.set(name, val)}
        });
    };

    setPreviewWindow = (name) => (event) => {
        const val = event.target.value;
        this.setState((previousState, props) => {
            return {previewWindows: previousState.previewWindows.set(name, val)}
        });
    };

    findDeleteResponse = (name) => {
        const dataPromiseKey = Object.keys(this.props).find(p => p === `deleteUpload_${name}`);
        if (dataPromiseKey) {
            return this.props[dataPromiseKey];
        }
        return null;
    };

    findCreateResponse = (name, start, end) => {
        const dataPromiseKey = Object.keys(this.props).find(p => p === `createTarget_${name}_${start}_${end}`);
        if (dataPromiseKey) {
            return this.props[dataPromiseKey];
        }
        return null;
    };

    renderUploaded = () => {
        const {uploads} = this.props;
        if (uploads.pending) {
            return (
                <ListGroup fill>
                    <ListGroupItem>
                        Loading uploaded files
                    </ListGroupItem>
                </ListGroup>
            );
        } else if (uploads.rejected) {
            return (
                <ListGroup fill>
                    <ListGroupItem>
                        Unable to fetch uploaded files - {uploads.reason.toString()}
                    </ListGroupItem>
                </ListGroup>
            );
        } else if (uploads.fulfilled) {
            const data = uploads.value.map(u => {
                const formattedDuration = DateTimeFormatter.ofPattern("HH:mm:ss.SSS").format(new LocalTime(0, 0).plusNanos(u.duration*1000000000));
                const {start, end} = this.calculateStartEnd(u.name, this.state);
                return Object.assign(u, {
                    fetchData: () => this.showSeries(u.name),
                    clearData: this.clearSeries,
                    deleteData: () => this.props.deleteData(u.name),
                    deleteResponse: this.findDeleteResponse(u.name),
                    createTarget: () => this.props.createTarget(u.name, start, end),
                    createResponse: this.findCreateResponse(u.name, start, end),
                    previewStart: this.getPreviewStart(u.name),
                    handlePreviewStart: this.setPreviewStart(u.name),
                    previewEnd: this.getPreviewEnd(u.name, formattedDuration),
                    handlePreviewEnd: this.setPreviewEnd(u.name),
                    previewResolution: this.getPreviewResolution(u.name),
                    handlePreviewResolution: this.setPreviewResolution(u.name),
                    previewWindow: this.getPreviewWindow(u.name),
                    handlePreviewWindow: this.setPreviewWindow(u.name),
                    durationStr: formattedDuration,
                    target: 'target' // dummy column
                });
            });
            return <UploadTable data={data}/>
        }
    };

    componentWillReceiveProps = (nextProps) => {
        if (nextProps.uploads) {
            if (nextProps.uploads.fulfilled) {
                const completeFiles = nextProps.uploads.value.map(u => u.name);
                this.setState((previousState, props) => {
                    return {uploaded: previousState.uploaded.filter(u => !completeFiles.includes(u.name))};
                });
            }
        }
    };

    renderPreview = () => {
        const {selectedChart} = this.state;
        if (selectedChart) {
            const {fetchedAnalysis} = this.props;
            if (fetchedAnalysis && fetchedAnalysis.fulfilled) {
                const series = Object.keys(fetchedAnalysis.value).filter(k => k !== 'analysedAt').map(k => {
                    return Object.assign(new PathSeries(k).acceptData(fetchedAnalysis.value[k]).rendered.toJS(), {
                        id: selectedChart,
                        series: k,
                        seriesIdx: 0
                    });
                });
                return <Preview loadedAt={fetchedAnalysis.value.analysedAt} series={series}/>
            } else {
                // TODO show error
                return null;
            }
        }
    };

    render() {
        const uploading = <Table fill striped bordered condensed hover>
            <thead>
            <tr>
                <th>Status</th>
                <th>Name</th>
                <th>Size (MB)</th>
                <th>Progress</th>
                <th>Elapsed Time (s)</th>
                <th>Rate (MB/s)</th>
                <th>Errors</th>
            </tr>
            </thead>
            <tbody>
            {this.state.uploaded.map(u => u.asRow())}
            </tbody>
        </Table>;
        const uploaded = this.renderUploaded();
        const preview = this.renderPreview();
        return (
            <Panel header="Upload" bsStyle="info">
                <ListGroup fill>
                    <ListGroupItem>
                        <Dropzone accept="audio/wav"
                                  onDrop={this.postFile}
                                  multiple={false}
                                  disablePreview={true}
                                  className="list-group-item"
                                  style={{
                                      borderWidth: 2,
                                      borderColor: '#ddd',
                                      borderStyle: 'dashed',
                                      borderRadius: 5
                                  }}>
                            <FontAwesome name="upload" size="lg"/>
                            &nbsp;&nbsp;
                            Drag and drop a file here or click to choose a file
                        </Dropzone>
                    </ListGroupItem>
                </ListGroup>
                {this.state.uploaded.size > 0 ? uploading : null}
                {uploaded}
                {preview}
            </Panel>
        );
    }
}

export default connect((props, context) => ( {
    uploads: {url: `${context.apiPrefix}/uploads`, refreshInterval: 1000},
    fetchAnalysis: (name, start, end, resolution, window) => ({
        fetchedAnalysis: `${context.apiPrefix}/uploads/${name}/${start}/${end}/${resolution}/${window}`
    }),
    deleteData: name => ({
        [`deleteUpload_${name}`]: {
            url: `${context.apiPrefix}/uploads/${name}`,
            method: 'DELETE'
        }
    }),
    createTarget: (name, start, end) => ({
        [`createTarget_${name}_${start}_${end}`]: {
            url: `${context.apiPrefix}/uploadtarget/${name}/${start}/${end}`,
            method: 'PUT'
        }
    })
} ))(Upload)