import React, {Component, PropTypes} from "react";
import {Button, ButtonToolbar, OverlayTrigger, Tooltip} from "react-bootstrap";
import FontAwesome from "react-fontawesome";
import sematable, {Table} from "sematable";
import "react-select/dist/react-select.css";

class ActionCell extends Component {
    getAnalyseButton(target) {
        if (target.isSelected) {
            return (
                <Button bsStyle="success"
                        onClick={() => target.clearTimeSeries()} bsSize="xsmall">
                    <FontAwesome name="eject"/>
                </Button>
            );
        } else {
            return (
                <Button bsStyle="primary" onClick={() => target.fetchTimeSeries()} bsSize="xsmall">
                    <FontAwesome name="line-chart"/>
                </Button>
            );
        }
    }

    getDeleteButton(row) {
        let deletePromise = row.deleteResponse;
        if (deletePromise) {
            if (deletePromise.pending) {
                return <Button bsStyle="danger" disabled bsSize="xsmall"><FontAwesome name="spinner" spin/></Button>;
            } else if (deletePromise.rejected) {
                const code = deletePromise.meta.response.status;
                const text = deletePromise.meta.response.statusText;
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
            } else if (deletePromise.fulfilled) {
                return (
                    <Button bsStyle="success" disabled bsSize="xsmall">
                        <FontAwesome name="check"/>&nbsp;Deleted
                    </Button>
                );
            }
        } else {
            return (
                <Button bsStyle="danger"
                        onClick={() => { row.clearTimeSeries(); row.deleteTarget(); }}
                        bsSize="xsmall">
                    <FontAwesome name="trash"/>
                </Button>
            );
        }
        return null;
    }

    render() {
        const analyseButton = this.getAnalyseButton(this.props.row);
        const deleteButton = this.getDeleteButton(this.props.row);
        return <ButtonToolbar>{analyseButton}{deleteButton}</ButtonToolbar>;
    }
}

[ActionCell].forEach(m => {
    m.propTypes = {
        row: PropTypes.object.isRequired,
    }
});


const columns = [
    {key: 'name', header: 'Name', primaryKey: true, filterable: true},
    {key: 'actions', header: 'Actions', Component: ActionCell},
];


class TargetTable extends Component {
    render() {
        return (
            <Table {...this.props}
                   columns={columns}
                   className="table-responsive table-condensed table-bordered table-hover table-striped"/>
        );
    }
}

export default sematable('targets', TargetTable, columns, {
    defaultPageSize: 6,
    sortKey: 'name',
    sortDirection: 'asc'
});
