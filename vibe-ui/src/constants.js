// magic value to specify that a multi select actually has nothing selected
export const NO_OPTION_SELECTED = "none";

export const SERIES_COLOURS = {
    x: [
        '#00ff00',
        '#009900',
        '#99ff99',
        '#ccffcc',
        '#006600',
        '#004c00',
    ],
    y: [
        '#ff0000',
        '#990000',
        '#ff6666',
        '#ff9999',
        '#660000',
        '#4c0000',
    ],
    z: [
        '#0000ff',
        '#000099',
        '#4c4cff',
        '#7f7fff',
        '#000066',
        '#00004c',
    ],
    sum: [
        '#ff00ff',
        '#990099',
        '#ff66ff',
        '#ff99ff',
        '#660066',
        '#4c004c',
    ],
    unknown: [
        '#000000',
        '#323232',
        '#4c4c4c',
        '#666666',
        '#7f7f7f',
        '#cccccc'
    ]
};

export function hexToRGBA(hexIn, opacity){
    const hex = hexIn.replace('#','');
    const r = parseInt(hex.substring(0,2), 16);
    const g = parseInt(hex.substring(2,4), 16);
    const b = parseInt(hex.substring(4,6), 16);
    return 'rgba('+r+','+g+','+b+','+opacity/100+')';
}