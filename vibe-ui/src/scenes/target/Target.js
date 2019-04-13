import React, {Component} from "react";
import Message from "../../components/Message";
import {Card, Col, Container, Row} from "react-bootstrap";
import {connect} from "react-refetch";
import Targets from "./Targets";
import CreateTarget from "./CreateTarget";
import HingeTargetCurve from "./HingeTargetCurve";
import WavTargetCurve from "./WavTargetCurve";
import PathSeries from "../../components/path/PathSeries";
import {API_PREFIX} from "../../App";

class Target extends Component {
    state = {selected: null, preview: null};

    handlePreview = (hingePoints) => {
        this.setState((previousState, props) => {
            return {preview: hingePoints};
        });
    };

    showTimeSeries = (targetId, type) => {
        this.setState((previousState, props) => {
            if (type === 'wav') {
                this.props.loadAnalysis(targetId);
            }
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
            return this.props.targets.value.find(t => t.name === targetId);
        }
        return null;
    }

    renderTimeSeriesIfAny() {
        if (this.state.preview) {
            return <HingeTargetCurve data={this.state.preview}/>
        } else {
            const target = this.findTimeSeriesData();
            if (target) {
                if (target.type === 'hinge') {
                    return <HingeTargetCurve data={target}/>
                } else if (target.type === 'wav') {
                    if (this.props.analysis && this.props.analysis.fulfilled) {
                        return <WavTargetCurve name={this.state.selected} data={this.props.analysis.value}/>
                    }
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
                <Card>
                    <Card.Header as={'h6'} className={'bg-info'}>Targets</Card.Header>
                    <Container>
                        <Row>
                            <Col md={7}>
                                <Targets targets={this.props.targets.value}
                                         showFunc={this.showTimeSeries}
                                         clearFunc={this.clearTimeSeries}
                                         selected={this.state.selected}/>
                            </Col>
                            <Col md={5}>
                                <CreateTarget previewFunc={this.handlePreview}/>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                {timeSeries}
                            </Col>
                        </Row>
                    </Container>
                </Card>
            );
        }
    }
}

export default connect((props) => ({
    targets: {url: `${API_PREFIX}/targets`, refreshInterval: 1000},
    loadAnalysis: target => ({
        analysis: {
            url: `${API_PREFIX}/targets/${target}`,
            then: analysis => ({
                value: new PathSeries(analysis.name).acceptData(analysis.data).rendered.toJS()
            })
        }
    })
}))(Target)