import React, {Component} from "react";
import PropTypes from "prop-types";
import {Button, ButtonToolbar, OverlayTrigger, Tooltip} from "react-bootstrap";
import FontAwesome from "react-fontawesome";
import ReactTable from 'react-table';

class ActionCell extends Component {
    getAnalyseButton(target) {
        if (target.isSelected) {
            return (
                <Button variant="success"
                        onClick={() => target.clearTimeSeries()} size="sm">
                    <FontAwesome name="eject"/>
                </Button>
            );
        } else {
            return (
                <Button variant="primary" onClick={() => target.fetchTimeSeries()} size="sm">
                    <FontAwesome name="line-chart"/>
                </Button>
            );
        }
    }

    getDeleteButton(row) {
        let deletePromise = row.deleteResponse;
        if (deletePromise) {
            if (deletePromise.pending) {
                return <Button variant="danger" disabled size="sm"><FontAwesome name="spinner" spin/></Button>;
            } else if (deletePromise.rejected) {
                const code = deletePromise.meta.response.status;
                const text = deletePromise.meta.response.statusText;
                const tooltip = <Tooltip id={row.name}>{code} - {text}</Tooltip>;
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
                    <Button variant="success" disabled size="sm">
                        <FontAwesome name="check"/>&nbsp;Deleted
                    </Button>
                );
            }
        } else {
            return (
                <Button variant="danger"
                        onClick={() => { row.clearTimeSeries(); row.deleteTarget(); }}
                        size="sm">
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

const typeCell = ({row}) => {
    const icon = row.type === 'hinge' ? "file-code-o" : "file-audio-o";
    return (
        <FontAwesome size="lg" name={icon}/>
    );
};

[typeCell, ActionCell].forEach(m => {
    m.propTypes = {
        row: PropTypes.object.isRequired,
    }
});


const columns = [
    {accessor: 'type', Header: 'Type', Cell: typeCell},
    {accessor: 'name', Header: 'Name', filterable: true},
    {accessor: 'actions', Header: 'Actions', Cell: ActionCell},
];

export default class TargetTable extends Component {
    render() {
        return (
            <ReactTable data={this.props.data}
                        columns={columns}
                        sortable={false}
                        defaultPageSize={5}
                        defaultSorted={[
                            {
                                id: "name",
                                desc: false
                            }
                        ]}
                        className={'-striped -highlight'}/>

        );
    }
}
