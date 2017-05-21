from setuptools import setup

from versioneer import get_cmdclass, get_version

def readme():
    with open('README.rst') as f:
        return f.read()


setup(name='vibe-analyser',
      version=get_version(),
      cmdclass=get_cmdclass(),
      description='A vibration analysis and data acquisition suite for the rpi',
      long_description=readme(),
      classifiers=[
          'Development Status :: 3 - Alpha',
          'Framework :: Flask',
          'License :: OSI Approved :: MIT License',
          'Programming Language :: Python :: 3.4',
          'Programming Language :: Python :: 3.5',
          'Intended Audience :: End Users/Desktop'
      ],
      url='http://github.com/3ll3d00d/vibe',
      author='Matt Khan',
      author_email='mattkhan+vibe@gmail.com',
      license='MIT',
      packages=[
          'analyser',
          'analyser.common',
          'analyser.resources',
          'core'
      ],
      package_dir={'': 'backend/src'},
      entry_points={
          'console_scripts': [
              'analyser = analyser.app:main',
          ],
      },
      install_requires=[
          'flask',
          'flask-restful',
          'numpy',
          'pyyaml',
          'requests',
          'scipy',
          'twisted',
          'librosa',
          'typing',
          'cffi',
          'pysoundfile'
      ],
      setup_requires=[
          'pytest-runner',
          'versioneer'
      ],
      tests_require=[
          'pytest'
      ],
      include_package_data=True,
      zip_safe=False)
