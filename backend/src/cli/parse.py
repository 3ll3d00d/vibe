import argparse

parser = argparse.ArgumentParser(description='Convert WAV files into FRDs')
parser.add_argument('-d', type=argparse.FileType('w'), help='directory containing the wavs to process')
parser.add_argument('-p', help='file prefix')

args = parser.parse_args()

