import React, {Component} from "react";
import {Grid, Row, Col} from "react-bootstrap";
import MeasurementConfigTable from "./MeasurementConfigTable";
import SetState from "./SetState";


class MeasurementConfig extends Component {
    render() {
        return (
            <div>
                <Grid>
                    <Row>
                        <Col md={10}>
                            <MeasurementConfigTable deviceNames={this.props.deviceNames}
                                                    stateByAttribute={this.props.stateByAttribute}/>
                        </Col>
                        <Col md={2}>
                            <SetState/>
                        </Col>
                    </Row>
                </Grid>
            </div>
        );
    }
}
export default MeasurementConfig;