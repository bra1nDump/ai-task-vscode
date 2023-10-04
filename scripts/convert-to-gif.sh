#!/bin/bash

# Check if an argument was provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 /path/to/input.mov"
    exit 1
fi

# Get the input file path
INPUT_PATH="$1"
# Get the directory, filename without extension, and extension
DIRNAME=$(dirname "$INPUT_PATH")
BASENAME=$(basename "$INPUT_PATH")
FILENAME="${BASENAME%.*}"
EXT="${BASENAME##*.}"

# Check if the file extension is 'mov'
if [ "$EXT" != "mov" ]; then
    echo "Please provide a .mov file"
    exit 1
fi

# Output path with .gif extension
OUTPUT_PATH="$DIRNAME/$FILENAME.gif"
OUTPUT_PATH_NO_PALETTE="$DIRNAME/$FILENAME-no-palatte.gif"

FPS=24
WIDTH=1280

# (Has weird dots, the effect is called dithering) First perform conversion without using a palette
ffmpeg -i "$INPUT_PATH" -vf "fps=$FPS,scale=$WIDTH:-1:flags=lanczos" "$OUTPUT_PATH_NO_PALETTE"

# Generate a palette, there's a warning here but it's fine, the result is still better than without a palette
ffmpeg -i "$INPUT_PATH" -vf "fps=$FPS,scale=$WIDTH:-1:flags=lanczos,palettegen" "$DIRNAME/palette.png"

# Convert the .mov file to .gif using the generated palette
ffmpeg -i "$INPUT_PATH" -i "$DIRNAME/palette.png" -filter_complex "fps=$FPS,scale=$WIDTH:-1:flags=lanczos[x];[x][1:v]paletteuse" "$OUTPUT_PATH"

# Remove the palette
rm "$DIRNAME/palette.png"

echo "GIF saved to $OUTPUT_PATH"
