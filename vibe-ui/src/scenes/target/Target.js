import React, {Component, PropTypes} from "react";
import Message from "../../components/Message";
import {Col, Grid, Panel, Row} from "react-bootstrap";
import {connect} from "react-refetch";
import Targets from "./Targets";
import CreateTarget from "./CreateTarget";
import TargetCurve from "./TargetCurve";

class Target extends Component {
    static contextTypes = {
        apiPrefix: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);
        this.showTimeSeries.bind(this);
        this.handlePreview.bind(this);
        this.state = {selected: null, preview: null};
    }

    handlePreview = (hingePoints) => {
        this.setState((previousState, props) => {
            return {preview: hingePoints};
        });
    };

    showTimeSeries = (targetId) => {
        this.setState((previousState, props) => {
            return {selected: targetId};
        });
    };

    clearTimeSeries = () => {
        this.setState((previousState, props) => {
            return {selected: null};
        });
    };

    findTimeSeriesData() {
        const targetId = this.state.selected;
        if (targetId) {
            return this.props.targets.find(t => t.id === targetId);
        }
        return null;
    }

    renderTimeSeriesIfAny() {
        if (this.state.preview) {
            return <TargetCurve data={this.state.preview}/>
        } else {
            const target = this.findTimeSeriesData();
            if (target) {
                const selected = this.props.targets.value.find(m => m.id === this.state.selected);
                if (selected) {
                    // render
                }
            }
        }
        return <div/>;
    }

    render() {
        const {targets} = this.props;
        if (targets.pending) {
            return (
                <div>
                    <Message type="info" message="Loading"/>
                </div>
            );
        } else if (targets.rejected) {
            return (
                <div>
                    <Message title="Unable to fetch data" type="danger" message={targets.reason.toString()}/>
                </div>
            );
        } else if (targets.fulfilled) {
            const timeSeries = this.renderTimeSeriesIfAny();
            return (
                <div>
                    <Grid>
                        <Row>
                            <Col>
                                <Panel header="Targets" bsStyle="info">
                                    <Row>
                                        <Col md={6}>
                                            <Targets targets={this.props.targets.value}
                                                     showFunc={this.showTimeSeries}
                                                     clearFunc={this.clearTimeSeries}
                                                     selected={this.state.selected}/>
                                        </Col>
                                        <Col md={6}>
                                            <CreateTarget previewFunc={this.handlePreview}/>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            {timeSeries}
                                        </Col>
                                    </Row>
                                </Panel>
                            </Col>
                        </Row>
                    </Grid>
                </div>
            );
        }
    }
}
export default connect((props, context) => ( {
    targets: {url: `${context.apiPrefix}/targets`, refreshInterval: 5000}
} ))(Target)