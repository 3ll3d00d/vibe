import React, {Component} from "react";
import PropTypes from "prop-types";
import {Button, ButtonGroup, InputGroup, Form, Modal} from "react-bootstrap";
import NumericInput from "react-numeric-input";
import FontAwesome from "react-fontawesome";

export default class Download extends Component {
    static propTypes = {
        toggleVisibility: PropTypes.func,
        resetDims: PropTypes.func,
        updateDims: PropTypes.func,
        currentChartDimensions: PropTypes.object,
        currentChartURL: PropTypes.string,
        visible: PropTypes.bool.isRequired
    };

    state = {
        height: this.props.currentChartDimensions.height,
        width: this.props.currentChartDimensions.width,
        initialised: false
    };

    componentWillReceiveProps = (nextProps) => {
        // if (!this.state.initialised) {
        //     this.setState({height: nextProps.currentChartDimensions.height, width: nextProps.currentChartDimensions.width});
        // }
    };

    handleWidth = (valNum, valStr) => {
        this.setState({width: valNum});
    };

    handleHeight = (valNum, valStr) => {
        this.setState({height: valNum});
    };

    getDownloadButton = () => {
        if (this.props.currentChartURL) {
            return (
                <Button download="chart.png" href={this.props.currentChartURL}>
                    <FontAwesome name="download"/>
                </Button>
            );
        }
        return <Button disabled><FontAwesome name="download"/></Button>;
    };

    getPropagateButton = () => {
        return (
            <Button onClick={() => this.props.updateDims(this.state.height, this.state.width)}>Update</Button>
        );
    };

    getResetButton = () => {
        return (
            <Button onClick={this.props.resetDims}>Reset</Button>
        );
    };

    render() {
        return (
            <Modal show={this.props.visible} onHide={this.props.toggleVisibility}>
                <Modal.Header>
                    <Modal.Title>Download Chart</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form inline>
                        <InputGroup bsSize="small">
                            <InputGroup.Addon>
                                <FontAwesome name="arrows-h"/>
                            </InputGroup.Addon>
                            <NumericInput step={10}
                                          precision={0}
                                          min={10}
                                          value={this.state.width}
                                          onChange={this.handleWidth}
                                          className="form-control"
                                          style={false}/>
                        </InputGroup>
                        {'  '}
                        <InputGroup bsSize="small">
                            <InputGroup.Addon>
                                <FontAwesome name="arrows-v"/>
                            </InputGroup.Addon>
                            <NumericInput step={10}
                                          precision={0}
                                          min={10}
                                          value={this.state.height}
                                          onChange={this.handleHeight}
                                          className="form-control"
                                          style={false}/>
                        </InputGroup>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <div>
                        Actual Size: {this.props.currentChartDimensions.width}
                        x {this.props.currentChartDimensions.height}
                    </div>
                    <ButtonGroup>
                        {this.getResetButton()}
                        {this.getPropagateButton()}
                        {this.getDownloadButton()}
                    </ButtonGroup>
                </Modal.Footer>
            </Modal>
        );
    }
}