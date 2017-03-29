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

    static contextTypes = {
        apiPrefix: PropTypes.string.isRequired
    };

    findResponse(id, responses) {
        const responseKey = `deleteTargetResponse_${id}`;
        if (responses && responses.hasOwnProperty(responseKey)) {
            return responses[responseKey];
        }
        return null;
    }

    convert(row, showFunc, clearFunc, selectedTarget, responses) {
        const deleteTarget = () => this.props.deleteFunc(row.name);
        const fetchTimeSeries = () => showFunc(row.name);
        return Object.assign(row, {
            deleteTarget: deleteTarget,
            deleteResponse: this.findResponse(row.name, responses),
            fetchTimeSeries: fetchTimeSeries,
            clearTimeSeries: clearFunc,
            isSelected: row.name === selectedTarget
        });
    }

    render() {
        const {targets, showFunc, clearFunc, selected, ...responses} = this.props;
        const data = targets.map(t => this.convert(t, showFunc, clearFunc, selected, responses));
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
