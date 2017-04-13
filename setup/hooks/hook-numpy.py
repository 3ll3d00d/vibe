# the built in hook-numpy.core.py is not picking up mkl_avx.dll and mkl_def.dll hence forcing the load here
# it seems it should via https://github.com/pyinstaller/pyinstaller/issues/1881 but that isn't firing for some reason
import os.path
import re

from PyInstaller import compat
from PyInstaller import log as logging

binaries = []

lib_dir = os.path.join(compat.base_prefix, "Library", "bin")
if os.path.isdir(lib_dir):
    re_mkllib = re.compile(r'^(?:lib)?mkl\w+\.(?:dll|so)', re.IGNORECASE)
    dlls_mkl = [f for f in os.listdir(lib_dir) if re_mkllib.match(f)]
    logger = logging.getLogger(__name__)
    if dlls_mkl:
        logger.info("MKL libraries found when importing numpy. Adding MKL to binaries " + str(dlls_mkl))
        binaries += [(os.path.join(lib_dir, f), '') for f in dlls_mkl]
    else:
        logger.warning("No MKL libs found")


