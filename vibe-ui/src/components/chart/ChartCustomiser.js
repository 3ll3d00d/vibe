import React, {Component} from "react";
import PropTypes from "prop-types";
import {
    Button,
    ButtonGroup,
    Checkbox,
    Col,
    ControlLabel,
    DropdownButton,
    Form,
    FormControl,
    FormGroup,
    InputGroup,
    MenuItem,
    Modal,
    OverlayTrigger,
    Tooltip,
    Well
} from "react-bootstrap";
import FontAwesome from "react-fontawesome";
import StylePicker from "./StylePicker";
import {fromJS, List, Map} from "immutable";
import PreciseIntNumericInput from "../PreciseIntNumericInput";

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
        showLegend: true,
        lineTension: 0.4,
        lineWidth: 1,
        lineFill: false,
        dotSize: 0,
        yStep: 0,
        presets: List(),
        presetName: ''
    };

    componentWillMount() {
        const jsonPresets = localStorage.getItem('presets');
        if (jsonPresets) {
            this.setState((previousState, props) => {
                const presets = previousState.presets.push(...JSON.parse(jsonPresets));
                const defaultPreset = presets.find(p => p.name === 'default');
                if (defaultPreset) {
                    const state = Object.assign({presets}, this.loadPresetInstance('default', defaultPreset));
                    this.props.updateChart(this.generateConfigToPropagate(state));
                    return state;
                } else {
                    return {presets};
                }
            });
        }
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

    handleLineTension = (valNum, valStr) => {
        this.setState({lineTension: valNum});
    };

    handleLineWidth = (valNum, valStr) => {
        this.setState({lineWidth: valNum});
    };

    handleYStep = (valNum, valStr) => {
        this.setState({yStep: valNum});
    };

    handleDotSize = (valNum, valStr) => {
        this.setState({dotSize: valNum});
    };

    handleLineFill = () => {
        this.setState((previousState, props) => {
            return {lineFill: !previousState.lineFill};
        });
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

    generateConfigToPropagate = (state) => {
        return {
            height: Math.round(state.height * 2 / 3),
            width: Math.round(state.width * 2 / 3),
            colours: state.namedColours.toJS(),
            title: {text: state.title, fontSize: state.titleSize},
            legend: state.showLegend,
            lineWidth: state.lineWidth,
            lineTension: state.lineTension,
            lineFill: state.lineFill,
            dotSize: state.dotSize,
            yStep: state.yStep
        };
    };

    updateChart = () => {
        this.props.updateChart(this.generateConfigToPropagate(this.state));
    };

    getPropagateButton = () => {
        return <Button onClick={this.updateChart}>Update</Button>;
    };

    getResetButton = () => {
        return <Button onClick={this.reset}>Reset</Button>;
    };

    savePreset = () => {
        const name = this.state.presetName;
        this.setState((previousState, props) => {
            const {height, width, namedColours, titleSize, showLegend, lineWidth, lineTension, lineFill, dotSize, yStep} = previousState;
            const colours = namedColours.toJS();
            const idx = previousState.presets.findIndex(p => p.name === name);
            const preset = {
                name,
                height,
                width,
                colours,
                titleSize,
                showLegend,
                lineWidth,
                lineTension,
                lineFill,
                dotSize,
                yStep
            };
            const nextPresets = idx > -1 ? previousState.presets.set(idx, preset) : previousState.presets.push(preset);
            localStorage.setItem('presets', JSON.stringify(nextPresets.toJS()));
            return {presets: nextPresets}
        });
    };

    deletePreset = () => {
        const name = this.state.presetName;
        this.setState((previousState, props) => {
            const idx = previousState.presets.findIndex(p => p.name === name);
            const nextPresets = idx > -1 ? previousState.presets.delete(idx) : previousState.presets;
            localStorage.setItem('presets', JSON.stringify(nextPresets.toJS()));
            return {presets: nextPresets, presetName: ''};
        });
    };

    loadPresetInstance = (name, preset) => {
        const {height, width, colours, titleSize, showLegend, lineWidth, lineTension, lineFill, dotSize, yStep} = preset;
        let newPreset = {
            height,
            width,
            namedColours: fromJS(colours),
            titleSize,
            showLegend,
            presetName: name,
            lineWidth,
            lineTension,
            lineFill,
            dotSize,
            yStep
        };
        if (!lineWidth) {
            newPreset = Object.assign(newPreset, {lineWidth: 2});
        }
        if (!lineTension) {
            newPreset = Object.assign(newPreset, {lineTension: 0.4});
        }
        if (!dotSize) {
            newPreset = Object.assign(newPreset, {dotSize: 0});
        }
        if (!yStep) {
            newPreset = Object.assign(newPreset, {yStep: 0});
        }
        return newPreset;
    };

    loadPreset = (name) => {
        const preset = this.state.presets.find(p => p.name === name);
        if (preset) {
            this.setState(this.loadPresetInstance(name, preset));
        }
    };

    handlePresetName = (event) => {
        this.setState({presetName: event.target.value});
    };

    cannotSavePreset = () => {
        const {presetName, height, width, titleSize} = this.state;
        return presetName.length === 0 || !height || !width || !titleSize;
    };

    cannotDeletePreset = () => {
        const {presets, presetName} = this.state;
        return presetName.length === 0 || presets.findIndex(p => p.name === presetName) === -1;
    };

    render() {
        const presetMenuItems = this.state.presets.toJS().map(p => <MenuItem key={p.name}
                                                                             eventKey={p.name}>{p.name}</MenuItem>);
        return (
            <Modal show={this.props.visible} onHide={this.props.toggleVisibility}>
                <Modal.Header>
                    <Modal.Title>Customise Chart</Modal.Title>
                    <Form inline>
                        <ButtonGroup>
                            <DropdownButton title="Presets" id="preset" onSelect={this.loadPreset}>
                                {presetMenuItems}
                            </DropdownButton>
                            <FormControl type="text" value={this.state.presetName} onChange={this.handlePresetName}/>
                            <Button disabled={this.cannotSavePreset()} onClick={this.savePreset}>
                                <FontAwesome name="floppy-o"/>
                            </Button>
                            <Button disabled={this.cannotDeletePreset()} onClick={this.deletePreset}>
                                <FontAwesome name="trash"/>
                            </Button>
                        </ButtonGroup>
                    </Form>
                </Modal.Header>
                <Modal.Body>
                    <Form horizontal>
                        <Well bsSize="small">
                            <FormGroup controlId="title">
                                <Col componentClass={ControlLabel} md={2}>Title</Col>
                                <Col md={6}>
                                    <FormControl type="text" value={this.state.title} onChange={this.handleTitle}/>
                                </Col>
                                <Col md={3}>
                                    <OverlayTrigger placement="bottom" overlay={<Tooltip id="ok">Font Size</Tooltip>}>
                                        <PreciseIntNumericInput precision={0}
                                                                min={6}
                                                                value={this.state.titleSize}
                                                                format={(number) => number}
                                                                handler={this.handleTitleSize}
                                                                placeholder="font size"/>
                                    </OverlayTrigger>
                                </Col>
                            </FormGroup>
                            <FormGroup controlId="size">
                                <Col componentClass={ControlLabel} md={2}>Dimensions</Col>
                                <Col md={3}>
                                    <InputGroup bsSize="small">
                                        <InputGroup.Addon>
                                            <FontAwesome name="arrows-h"/>
                                        </InputGroup.Addon>
                                        <PreciseIntNumericInput precision={0}
                                                                step={10}
                                                                min={10}
                                                                value={this.state.width}
                                                                format={(number) => number}
                                                                handler={this.handleWidth}/>
                                    </InputGroup>
                                </Col>
                                <Col md={3}>
                                    <InputGroup bsSize="small">
                                        <InputGroup.Addon>
                                            <FontAwesome name="arrows-v"/>
                                        </InputGroup.Addon>
                                        <PreciseIntNumericInput precision={0}
                                                                step={10}
                                                                min={10}
                                                                value={this.state.height}
                                                                format={(number) => number}
                                                                handler={this.handleHeight}/>
                                    </InputGroup>
                                </Col>
                                <Col md={3}>
                                    <OverlayTrigger placement="bottom"
                                                    overlay={<Tooltip id="ok">Y Axis Step Size</Tooltip>}>
                                        <InputGroup bsSize="small">
                                            <InputGroup.Addon>y</InputGroup.Addon>
                                            <PreciseIntNumericInput precision={0}
                                                                    step={1}
                                                                    min={0}
                                                                    value={this.state.yStep}
                                                                    format={(number) => number}
                                                                    handler={this.handleYStep}/>
                                        </InputGroup>
                                    </OverlayTrigger>
                                </Col>
                            </FormGroup>
                            <FormGroup controlId="line">
                                <Col componentClass={ControlLabel} md={2}>Line Style</Col>
                                <Col md={3}>
                                    <OverlayTrigger placement="bottom"
                                                    overlay={<Tooltip id="ok">Line width (in pixels)</Tooltip>}>
                                        <PreciseIntNumericInput precision={0}
                                                                step={1}
                                                                min={0}
                                                                value={this.state.lineWidth}
                                                                format={(number) => number}
                                                                handler={this.handleLineWidth}/>
                                    </OverlayTrigger>
                                </Col>
                                <Col md={3}>
                                    <OverlayTrigger placement="bottom"
                                                    overlay={<Tooltip id="ok">Bezier curve tension (lower number =
                                                        straighter lines, 0 = join the dots)</Tooltip>}>
                                        <PreciseIntNumericInput precision={2}
                                                                step={0.01}
                                                                min={0}
                                                                max={1}
                                                                placeholder="tension"
                                                                value={this.state.lineTension}
                                                                format={(number) => number}
                                                                handler={this.handleLineTension}/>
                                    </OverlayTrigger>
                                </Col>
                                <Col md={3}>
                                    <OverlayTrigger placement="bottom"
                                                    overlay={<Tooltip id="ok">Dot Size</Tooltip>}>
                                        <PreciseIntNumericInput precision={0}
                                                                step={1}
                                                                min={0}
                                                                value={this.state.dotSize}
                                                                format={(number) => number}
                                                                handler={this.handleDotSize}/>
                                    </OverlayTrigger>
                                </Col>
                            </FormGroup>
                            <FormGroup controlId="legend">
                                <Col md={3} mdOffset={2}>
                                    <Checkbox onChange={this.handleShowLegend} checked={this.state.showLegend}>
                                        Show Legend?
                                    </Checkbox>
                                </Col>
                                <Col md={3}>
                                    <Checkbox onChange={this.handleLineFill} checked={this.state.lineFill}>
                                        Fill Lines?
                                    </Checkbox>
                                </Col>
                            </FormGroup>
                        </Well>
                        <FormGroup controlId="style">
                            <Col componentClass={ControlLabel} md={2}>Colours</Col>
                            <Col md={9}>
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
            </Modal> // eslint-disable-line react/style-prop-object
        );
    }
}