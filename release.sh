#!/bin/bash -e
BUILD_ROOT=/tmp
PYTHON_VENV_ROOT=${BUILD_ROOT}/venv
[[ ! -d ${PYTHON_VENV_ROOT} ]] && mkdir ${PYTHON_VENV_ROOT}
RELEASE_STORE=${BUILD_ROOT}/output
[[ ! -d ${RELEASE_STORE} ]] && mkdir ${RELEASE_STORE}

function log_it() {
    echo "**** ${1} ****"
}

function fail_hard() {
    log_it "${1}"
    exit 1
}

function link_setup() {
    log_it "Linking ${1}"
    [[ -e setup.py ]] && rm setup.py
    [[ -e MANIFEST.in ]] && rm MANIFEST.in
    if [ -d setup/${1} ]
    then
        cp setup/${1}/setup.py setup.py
        cp setup/${1}/MANIFEST.in MANIFEST.in
    else
        fail_hard "Unable to link setup for ${1}"
    fi
}

function init_release() {
    log_it "Releasing ${1}"
    [[ -d ${BUILD_ROOT}/vibe ]] && rm -Rf ${BUILD_ROOT}/vibe
    [[ -d ${PYTHON_VENV_ROOT}/${1} ]] && rm -Rf ${PYTHON_VENV_ROOT}/${1}
    log_it "Creating venv ${1}"
    cd ${PYTHON_VENV_ROOT}
    python3 -m venv ${1}
    log_it "Activating venv ${1}"
    source ${1}/bin/activate
    local INVENV=$(python -c 'import sys; print ("1" if sys.prefix != sys.base_prefix else "0")')
    [[ ${INVENV} == 1 ]] || fail_hard "Did not activate venv ${1}"
    log_it "Upgrading setuptools "
    pip install setuptools --upgrade
    log_it "Upgrading wheel "
    pip install wheel --upgrade
    log_it "Installing twine"
    pip install twine
    log_it "Cloning vibe"
    git clone git@github.com:3ll3d00d/vibe.git ${BUILD_ROOT}/vibe
    [[ $? -eq 0 ]] || fail_hard "Unable to checkout vibe"
    cd ${BUILD_ROOT}/vibe
    log_it "Checking out ${TAG}"
    git checkout ${TAG}
    [[ $? -eq 0 ]] || fail_hard "${TAG} does not exist"
    link_setup ${1}
}

function do_release() {
    log_it "Performing ${1} release for ${2}"
    cd ${BUILD_ROOT}/vibe
    if [[ ${1} == "local" ]]
    then
        python3 setup.py clean --all sdist bdist_wheel
    elif [[ ${1} == "full" ]]
    then
        log_it "Building ${2}-${TAG}"
        python3 setup.py clean --all sdist bdist_wheel
        log_it "Registering vibe-${2}-${TAG}.tar.gz via twine"
        twine register "dist/vibe-${2}-${TAG}.tar.gz"
        log_it "Registering vibe_${2}-${TAG}-py3-none-any.whl via twine"
        twine register "dist/vibe_${2}-${TAG}-py3-none-any.whl"
        log_it "Uploading to pypi"
        twine upload dist/*
    else
        fail_hard "Unknown release operation ${1}"
    fi
    log_it "Copying to ${RELEASE_STORE} - " dist/*
    cp dist/* "${RELEASE_STORE}/"
}

function clean_release() {
    deactivate
    [[ -d ${BUILD_ROOT}/vibe ]] && rm -Rf ${BUILD_ROOT}/vibe
    [[ -d ${PYTHON_VENV_ROOT}/${1} ]] && rm -Rf ${PYTHON_VENV_ROOT}/${1}
}

function prepare_ui() {
    log_it "Building UI"
    pushd vibe-ui
    yarn install
    [[ $? -ne 0 ]] && fail_hard "yarn install failed"
    yarn build
    [[ $? -ne 0 ]] && fail_hard "yarn build failed"
    popd
    [[ -d analyser/static ]] && rm -Rf analyser/static
    mv vibe-ui/build analyser/static
    [[ $? -ne 0 ]] && fail_hard "failed to move prod ui build"
}

TAG="${1}"
RELEASE_TYPE="${2}"
[[ -z ${RELEASE_TYPE} ]] && RELEASE_TYPE="local"

log_it "Releasing v${TAG}"

init_release "recorder"
do_release "${RELEASE_TYPE}" "recorder"
clean_release "recorder"

init_release "analyser"
prepare_ui
do_release "${RELEASE_TYPE}" "analyser"
clean_release "analyser"
