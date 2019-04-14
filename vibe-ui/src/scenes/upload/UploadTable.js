import React, {Component} from "react";
import PropTypes from "prop-types";
import {Button, ButtonToolbar, FormControl, OverlayTrigger, Tooltip} from "react-bootstrap";
import FontAwesome from "react-fontawesome";
import ReactTable from 'react-table';
import {SCIPY_WINDOWS} from "../../constants";

const sizeCell = ({row}) => {
    return <div>{Math.round(row.size / 1000) / 1000}</div>;
};

const durationCell = ({row}) => {
    return <div>{row.durationStr}</div>;
};

const statusCell = ({row}) => {
    if (row.status === 'loaded') {
        return <FontAwesome name="check" size="lg"/>;
    } else if (row.status === 'failed') {
        return <FontAwesome name="times" size="lg"/>;
    } else if (row.status === 'converting') {
        return <FontAwesome name="spinner" size="lg" spin/>;
    } else {
        return <FontAwesome name="question" size="lg"/>;
    }
};

class ActionCell extends Component {
    getAnalyseButton = (upload) => {
        if (upload.status === 'loaded') {
            if (upload.isSelectedChart) {
                return (
                    <Button variant="success"
                            onClick={upload.clearData} size="sm">
                        <FontAwesome name="eject"/>
                    </Button>
                );
            } else {
                return (
                    <Button variant="primary" onClick={upload.fetchData} size="sm">
                        <FontAwesome name="line-chart"/>
                    </Button>
                );
            }
        }
        return null;
    };

    getDeleteButton = (upload) => {
        let deletePromise = upload.deleteResponse;
        if (deletePromise) {
            if (deletePromise.pending) {
                return <Button variant="danger" disabled size="sm"><FontAwesome name="spinner" spin/></Button>;
            } else if (deletePromise.rejected) {
                const code = deletePromise.meta.response.status;
                const text = deletePromise.meta.response.statusText;
                const tooltip = <Tooltip id={upload.name}>{code} - {text}</Tooltip>;
                return (
                    <OverlayTrigger placement="top" overlay={tooltip}>
                        <div>
                            <Button variant="warning" size="sm">
                                <FontAwesome name="exclamation"/>&nbsp;FAILED
                            </Button>
                        </div>
                    </OverlayTrigger>
                );
            } else if (deletePromise.fulfilled) {
                return (
                    <Button variant="success" disabled size="xm">
                        <FontAwesome name="check"/>&nbsp;Deleted
                    </Button>
                );
            }
        } else if (upload.status === 'loaded') {
            return (
                <Button variant="danger" onClick={() => upload.deleteData()} size="xm">
                    <FontAwesome name="trash"/>
                </Button>
            );
        }
        return null;
    };

    render() {
        const analyseButton = this.getAnalyseButton(this.props.row);
        const deleteButton = this.getDeleteButton(this.props.row);
        return <ButtonToolbar>{analyseButton}{deleteButton}</ButtonToolbar>;
    }
}

const previewStartCell = ({row}) => {
    return <FormControl type="time" step="0.001" min="0" max={row.durationStr} value={row.previewStart}
                        onChange={row.handlePreviewStart}/>;
};

const previewEndCell = ({row}) => {
    return <FormControl type="time" step="0.001" min="0" max={row.durationStr} value={row.previewEnd}
                        onChange={row.handlePreviewEnd}/>;
};

const previewResolutionCell = ({row}) => {
    return <FormControl as="select"
                        placeholder="select"
                        value={row.previewResolution}
                        onChange={row.handlePreviewResolution}>
        <option value="1">1 Hz</option>
        <option value="2">0.5 Hz</option>
        <option value="4">0.25 Hz</option>
        <option value="8">0.125 Hz</option>
    </FormControl>;
};

const previewWindowCell = ({row}) => {
    const options = SCIPY_WINDOWS.map(w => {
        return <option key={w} value={w}>{w}</option>;
    });
    return <FormControl as="select"
                        placeholder="select"
                        value={row.previewWindow}
                        onChange={row.handlePreviewWindow}>
        {options}
    </FormControl>;
};

const targetCell = ({row}) => {
    let targetPromise = row.createResponse;
    if (targetPromise) {
        if (targetPromise.pending) {
            return <Button variant="danger" disabled size="xm"><FontAwesome name="spinner" spin/>&nbsp;Saving</Button>;
        } else if (targetPromise.rejected) {
            const code = targetPromise.meta.response.status;
            const text = targetPromise.meta.response.statusText;
            const tooltip = <Tooltip id={row.name}>{code} - {text}</Tooltip>;
            return (
                <OverlayTrigger placement="top" overlay={tooltip}>
                    <div>
                        <Button variant="warning" size="xm">
                            <FontAwesome name="exclamation"/>&nbsp;FAILED
                        </Button>
                    </div>
                </OverlayTrigger>
            );
        } else if (targetPromise.fulfilled) {
            return (
                <Button variant="success" disabled size="xm">
                    <FontAwesome name="check"/>&nbsp;Saved
                </Button>
            );
        }
    } else if (row.status === 'loaded') {
        return (
            <Button variant="primary" onClick={() => row.createTarget(row.name, row.start, row.end)} size="xm">
                <FontAwesome name="bullseye"/>
            </Button>
        );
    }
    return null;
};

[sizeCell, durationCell, statusCell, targetCell, ActionCell, previewStartCell, previewEndCell, previewResolutionCell].forEach(m => {
    m.propTypes = {
        row: PropTypes.object.isRequired,
    }
});

const columns = [
    {accessor: 'status', Header: 'Status', Cell: statusCell},
    {accessor: 'name', Header: 'Name', sortable: true, filterable: true},
    {accessor: 'size', Header: 'Size (MB)', Cell: sizeCell},
    {accessor: 'durationStr', Header: 'Duration (s)'},
    {accessor: 'fs', Header: 'Fs (Hz)'},
    {Header: 'Preview Start', Cell: previewStartCell},
    {Header: 'End', Cell: previewEndCell},
    {accessor: 'resolution', Header: 'Resolution (Hz)', Cell: previewResolutionCell},
    {accessor: 'window', Header: 'FFT Window', Cell: previewWindowCell},
    {accessor: 'target', Header: 'Create Target', Cell: targetCell},
    {accessor: 'actions', Header: 'Preview/Delete', Cell: ActionCell},
];

export default class UploadTable extends Component {
    render() {
        return (
            <ReactTable data={this.props.data}
                        columns={columns}
                        sortable={false}
                        defaultPageSize={5}
                        defaultSorted={[
                            {
                                id: "startTime",
                                desc: true
                            }
                        ]}
                        className={'-striped -highlight'}/>
        );
    }
}
