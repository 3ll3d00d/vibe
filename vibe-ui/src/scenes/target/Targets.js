import React, {Component, PropTypes} from "react";
import {connect} from "react-refetch";
import TargetTable from "./TargetTable";

class Targets extends Component {
    static propTypes = {
        targets: PropTypes.array.isRequired,
        showFunc: PropTypes.func.isRequired,
        clearFunc: PropTypes.func.isRequired,
        selected: PropTypes.string
    };

    findResponse(id, responses) {
        const responseKey = `deleteTargetResponse_${id}`;
        if (responses.hasOwnProperty(responseKey)) {
            return responses[responseKey];
        }
        return null;
    }

    convert(row, deleteFunc, showFunc, clearFunc, selectedTarget, responses) {
        const deleteTarget = () => deleteFunc(row.id);
        const fetchTimeSeries = () => showFunc(row.id);
        return Object.assign(row, {
            deleteTarget: deleteTarget,
            deleteResponse: this.findResponse(row.id, responses),
            fetchTimeSeries: fetchTimeSeries,
            clearTimeSeries: clearFunc,
            isSelected: row.id === selectedTarget
        });
    }

    render() {
        const {targets, showFunc, clearFunc, selectedTarget, ...responses} = this.props;
        const data = targets.map(t => this.convert(t, showFunc, clearFunc, selectedTarget, responses));
        return <TargetTable data={data}/>;
    }
}

export default connect((props, context) => ({
    deleteFunc: targetId => ({
        [`deleteTargetResponse_${targetId}`]: {
            url: `${context.apiPrefix}/targets/${targetId}`,
            method: 'DELETE'
        }
    })
}))(Targets)
