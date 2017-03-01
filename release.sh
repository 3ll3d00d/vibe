#!/bin/bash
BUILD_ROOT=/tmp
PYTHON_VENV_ROOT=${BUILD_ROOT}/venv
[[ ! -d ${PYTHON_VENV_ROOT} ]] && mkdir ${PYTHON_VENV_ROOT}
RELEASE_STORE=${BUILD_ROOT}/output
[[ ! -d ${RELEASE_STORE} ]] && mkdir ${RELEASE_STORE}

function fail_hard() {
    echo "**** ${1} ****"
    exit 1
}

function link_setup() {
    echo "Linking ${1}"
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
    echo "Releasing ${1}"
    [[ -d ${BUILD_ROOT}/vibe ]] && rm -Rf ${BUILD_ROOT}/vibe
    [[ -d ${PYTHON_VENV_ROOT}/${1} ]] && rm -Rf ${PYTHON_VENV_ROOT}/${1}
    echo "Creating venv ${1}"
    cd ${PYTHON_VENV_ROOT}
    python3 -m venv ${1}
    echo "Activating venv ${1}"
    source ${1}/bin/activate
    local INVENV=$(python -c 'import sys; print ("1" if sys.prefix != sys.base_prefix else "0")')
    [[ ${INVENV} =  = 1 ]] || fail_hard "Did not activate venv ${1}"
    echo "Upgrading setuptools "
    pip install setuptools --upgrade
    echo "Upgrading wheel "
    pip install wheel --upgrade
    echo "Cloning vibe"
    git clone git@github.com:3ll3d00d/vibe.git ${BUILD_ROOT}/vibe
    [[ $? -eq 0 ]] || fail_hard "Unable to checkout vibe"
    cd ${BUILD_ROOT}/vibe
    echo "Checking out ${TAG}"
    git checkout ${TAG}
    [[ $? -eq 0 ]] || fail_hard "${TAG} does not exist"
    link_setup ${1}
}

function do_release() {
    echo "Performing ${1} release for ${2}"
    cd ${BUILD_ROOT}/vibe
    if [[ ${1} == "local" ]]
    then
        python3 setup.py clean --all sdist bdist_wheel
    elif [[ ${1} == "full" ]]
    then
        python3 setup.py clean --all sdist bdist_wheel
    else
        fail_hard "Unknown release operation ${1}"
    fi
    echo "Copying to ${RELEASE_STORE} - " dist/*
    cp dist/* ${RELEASE_STORE}/
}

function clean_release() {
    deactivate
    [[ -d ${BUILD_ROOT}/vibe ]] && rm -Rf ${BUILD_ROOT}/vibe
    [[ -d ${PYTHON_VENV_ROOT}/${1} ]] && rm -Rf ${PYTHON_VENV_ROOT}/${1}
}

function prepare_ui() {
    echo "Building UI"
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

echo "Releasing v${TAG}"

init_release "recorder"
do_release "${RELEASE_TYPE}" "recorder"
clean_release "recorder"

init_release "analyser"
prepare_ui
do_release "${RELEASE_TYPE}" "analyser"
clean_release "analyser"
