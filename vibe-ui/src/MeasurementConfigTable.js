import React, {Component} from "react";
import {BootstrapTable, TableHeaderColumn} from "react-bootstrap-table";
import "react-bootstrap-table/dist/react-bootstrap-table.min.css";

// TODO custom editor to only allow valid values to be specified for certain attributes

class MeasurementConfigTable extends Component {

    render() {
        let deviceColumns = this.props.deviceNames.map((deviceName) =>
            <TableHeaderColumn key={deviceName} dataField={deviceName} editable={ false }>
                {deviceName}
            </TableHeaderColumn>
        );
        let cellEditProp = {mode: 'click'};

        return (
            <div>
                <BootstrapTable data={ this.props.stateByAttribute } striped={ true } hover={ true }
                                cellEdit={ cellEditProp }>
                    <TableHeaderColumn isKey dataField='attribute' editable={ false }/>
                    <TableHeaderColumn dataField='target'>Target State</TableHeaderColumn>
                    {deviceColumns}
                </BootstrapTable>
            </div>
        );
    }
}
export default MeasurementConfigTable;