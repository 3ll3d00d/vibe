import React, {Component} from "react";
import PropTypes from "prop-types";
import {
    Button,
    ButtonGroup,
    Checkbox,
    Col,
    ControlLabel,
    Form,
    FormControl,
    FormGroup,
    InputGroup,
    Modal,
    Well
} from "react-bootstrap";
import NumericInput from "react-numeric-input";
import FontAwesome from "react-fontawesome";
import StylePicker from "./StylePicker";
import {Map} from "immutable";

const DEFAULT_COLOURS = Map({
    'background': {r: 255, g: 255, b: 255, a: 1},
    'gridlines': {r: 0, g: 0, b: 0, a: 0.1},
    'text': {r: 102, g: 102, b: 102, a: 1}
});

export default class ChartCustomiser extends Component {
    static propTypes = {
        toggleVisibility: PropTypes.func,
        resetCustomChartConfig: PropTypes.func,
        updateChart: PropTypes.func,
        currentChartDimensions: PropTypes.object,
        currentChartURL: PropTypes.string,
        visible: PropTypes.bool.isRequired
    };

    state = {
        height: this.props.currentChartDimensions.height,
        width: this.props.currentChartDimensions.width,
        namedColours: DEFAULT_COLOURS,
        title: '',
        titleSize: 12,
        showLegend: true
    };

    reset = () => {
        this.setState({namedColours: DEFAULT_COLOURS});
        this.props.resetCustomChartConfig();
    };

    handleColourChange = (name, colour) => {
        this.setState((previousState, props) => {
            return {namedColours: previousState.namedColours.set(name, colour)}
        });
    };

    handleWidth = (valNum, valStr) => {
        this.setState({width: valNum});
    };

    handleHeight = (valNum, valStr) => {
        this.setState({height: valNum});
    };

    handleTitle = (event) => {
        this.setState({title: event.target.value});
    };

    handleTitleSize = (valNum, valStr) => {
        this.setState({titleSize: valNum});
    };

    handleShowLegend = () => {
        this.setState((previousState, props) => {
            return {showLegend: !previousState.showLegend};
        });
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

    updateChart = () => {
        this.props.updateChart({
            height: Math.round(this.state.height * 2 / 3),
            width: Math.round(this.state.width * 2 / 3),
            colours: this.state.namedColours.toJS(),
            title: {text: this.state.title, fontSize: this.state.titleSize},
            legend: this.state.showLegend
        });
    };

    getPropagateButton = () => {
        return <Button onClick={this.updateChart}>Update</Button>;
    };

    getResetButton = () => {
        return <Button onClick={this.reset}>Reset</Button>;
    };

    render() {
        return (
            <Modal show={this.props.visible} onHide={this.props.toggleVisibility}>
                <Modal.Header>
                    <Modal.Title>Customise Chart</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form horizontal>
                        <Well bsSize="small">
                            <FormGroup controlId="title">
                                <Col componentClass={ControlLabel} md={2}>Title</Col>
                                <Col md={8}>
                                    <FormControl type="text" value={this.state.title} onChange={this.handleTitle}/>
                                </Col>
                            </FormGroup>
                            <FormGroup controlId="titleSize">
                                <Col componentClass={ControlLabel} md={2}>Title Size</Col>
                                <Col md={8}>
                                    <NumericInput step={1}
                                                  precision={0}
                                                  min={6}
                                                  value={this.state.titleSize}
                                                  onChange={this.handleTitleSize}
                                                  className="form-control"
                                                  style={false}/>
                                </Col>
                            </FormGroup>
                            <FormGroup controlId="legend">
                                <Col md={8} mdOffset={2}>
                                    <Checkbox onChange={this.handleShowLegend} checked={this.state.showLegend}>
                                        Show Legend?
                                    </Checkbox>
                                </Col>
                            </FormGroup>
                            <FormGroup controlId="size">
                                <Col componentClass={ControlLabel} md={2}>Dimensions</Col>
                                <Col md={8}>
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
                                    {'  '}
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
                                </Col>
                            </FormGroup>
                        </Well>
                        <FormGroup controlId="style">
                            <Col componentClass={ControlLabel} md={2}>Colours</Col>
                            <Col md={8}>
                                <StylePicker namedColours={this.state.namedColours}
                                             selectColour={this.handleColourChange}/>
                            </Col>
                        </FormGroup>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <div>
                        Actual Size: {Math.floor(this.props.currentChartDimensions.width * 3 / 2)}
                        x {Math.floor(this.props.currentChartDimensions.height * 3 / 2)}
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