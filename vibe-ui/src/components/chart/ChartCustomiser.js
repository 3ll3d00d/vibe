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
        presets: List(),
        presetName: ''
    };

    componentWillMount() {
        const presets = localStorage.getItem('presets');
        if (presets) {
            this.setState((previousState, props) => {
                return {presets: previousState.presets.push(...JSON.parse(presets))}
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

    savePreset = () => {
        const name = this.state.presetName;
        this.setState((previousState, props) => {
            const {height, width, namedColours, titleSize, showLegend} = previousState;
            const colours = namedColours.toJS();
            const idx = previousState.presets.findIndex(p => p.name === name);
            const preset = {name, height, width, colours, titleSize, showLegend};
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
            localStorage.set('presets', JSON.stringify(nextPresets.toJS()));
            return {presets: nextPresets, presetName: ''};
        });
    };

    loadPreset = (name) => {
        const preset = this.state.presets.find(p => p.name === name);
        if (preset) {
            const {height, width, colours, titleSize, showLegend} = preset;
            this.setState({height, width, namedColours: fromJS(colours), titleSize, showLegend, presetName: name});
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
                                <FontAwesome name="plus"/>
                            </Button>
                            <Button disabled={this.cannotDeletePreset()} onClick={this.deletePreset}>
                                <FontAwesome name="minus"/>
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
                                <Col md={2}>
                                    <PreciseIntNumericInput precision={0}
                                                            min={6}
                                                            value={this.state.titleSize}
                                                            format={(number) => number}
                                                            handler={this.handleTitleSize}/>
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
                                <Col md={4}>
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
                                <Col md={4}>
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
            </Modal> // eslint-disable-line react/style-prop-object
        );
    }
}