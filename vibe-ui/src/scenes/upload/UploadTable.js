import React, {Component} from "react";
import PropTypes from "prop-types";
import {Button, ButtonToolbar, FormControl, OverlayTrigger, Tooltip} from "react-bootstrap";
import FontAwesome from "react-fontawesome";
import sematable, {Table} from "sematable";
import "react-select/dist/react-select.css";
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
                    <Button bsStyle="success"
                            onClick={upload.clearData} bsSize="xsmall">
                        <FontAwesome name="eject"/>
                    </Button>
                );
            } else {
                return (
                    <Button bsStyle="primary" onClick={upload.fetchData} bsSize="xsmall">
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
                return <Button bsStyle="danger" disabled bsSize="xsmall"><FontAwesome name="spinner" spin/></Button>;
            } else if (deletePromise.rejected) {
                const code = deletePromise.meta.response.status;
                const text = deletePromise.meta.response.statusText;
                const tooltip = <Tooltip id={upload.name}>{code} - {text}</Tooltip>;
                return (
                    <OverlayTrigger placement="top" overlay={tooltip}>
                        <div>
                            <Button bsStyle="warning" bsSize="xsmall">
                                <FontAwesome name="exclamation"/>&nbsp;FAILED
                            </Button>
                        </div>
                    </OverlayTrigger>
                );
            } else if (deletePromise.fulfilled) {
                return (
                    <Button bsStyle="success" disabled bsSize="xsmall">
                        <FontAwesome name="check"/>&nbsp;Deleted
                    </Button>
                );
            }
        } else if (upload.status === 'loaded') {
            return (
                <Button bsStyle="danger" onClick={() => upload.deleteData()} bsSize="xsmall">
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
    return <FormControl componentClass="select"
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
    return <FormControl componentClass="select"
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
            return <Button bsStyle="danger" disabled bsSize="xsmall"><FontAwesome name="spinner" spin/>&nbsp;Saving</Button>;
        } else if (targetPromise.rejected) {
            const code = targetPromise.meta.response.status;
            const text = targetPromise.meta.response.statusText;
            const tooltip = <Tooltip id={row.name}>{code} - {text}</Tooltip>;
            return (
                <OverlayTrigger placement="top" overlay={tooltip}>
                    <div>
                        <Button bsStyle="warning" bsSize="xsmall">
                            <FontAwesome name="exclamation"/>&nbsp;FAILED
                        </Button>
                    </div>
                </OverlayTrigger>
            );
        } else if (targetPromise.fulfilled) {
            return (
                <Button bsStyle="success" disabled bsSize="xsmall">
                    <FontAwesome name="check"/>&nbsp;Saved
                </Button>
            );
        }
    } else if (row.status === 'loaded') {
        return (
            <Button bsStyle="primary" onClick={() => row.createTarget(row.name, row.start, row.end)} bsSize="xsmall">
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
    {key: 'status', header: 'Status', Component: statusCell},
    {key: 'name', header: 'Name', sortable: true, filterable: true, primaryKey: true},
    {key: 'size', header: 'Size (MB)', Component: sizeCell},
    {key: 'duration', header: 'Duration (s)', Component: durationCell},
    {key: 'fs', header: 'Fs (Hz)'},
    {key: 'start', header: 'Preview Start', Component: previewStartCell},
    {key: 'end', header: 'End', Component: previewEndCell},
    {key: 'resolution', header: 'Resolution (Hz)', Component: previewResolutionCell},
    {key: 'window', header: 'FFT Window', Component: previewWindowCell},
    {key: 'target', header: 'Create Target', Component: targetCell},
    {key: 'actions', header: 'Preview/Delete', Component: ActionCell},
];

class UploadTable extends Component {
    render() {
        return (
            <Table {...this.props}
                   columns={columns}
                   className="table-responsive table-condensed table-bordered table-hover table-striped"/>
        );
    }
}

export default sematable('uploads', UploadTable, columns, {
    defaultPageSize: 3,
    sortKey: 'startTime',
    sortDirection: 'desc'
});
