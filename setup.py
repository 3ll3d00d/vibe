from setuptools import setup


def readme():
    with open('README.rst') as f:
        return f.read()


setup(name='rpi-vibe',
      version='0.0.1',
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
      packages=['analyser', 'core', 'recorder'],
      # install_requires=[
      #
      # ],
      setup_requires=[
          'pytest-runner'
      ],
      tests_require=[
          'pytest'
      ],
      include_package_data=True,
      zip_safe=False)
