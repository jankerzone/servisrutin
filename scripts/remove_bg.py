#!/usr/bin/env python3
"""
Remove solid-ish background from an image and export transparent PNG.

Usage:
  python3 scripts/remove_bg.py input.jpg output.png
  python3 scripts/remove_bg.py input.jpg output.png --tolerance 45
  python3 scripts/remove_bg.py input.jpg output.png --background-rgb 240,240,240
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path
from typing import Iterable, Tuple

from PIL import Image


Rgb = Tuple[int, int, int]


def parse_rgb(value: str) -> Rgb:
    parts = value.split(",")
    if len(parts) != 3:
        raise argparse.ArgumentTypeError("RGB must be in form r,g,b")

    try:
        r, g, b = (int(x.strip()) for x in parts)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("RGB values must be integers") from exc

    for channel in (r, g, b):
        if channel < 0 or channel > 255:
            raise argparse.ArgumentTypeError("RGB values must be between 0 and 255")
    return (r, g, b)


def color_distance_sq(a: Rgb, b: Rgb) -> int:
    dr = a[0] - b[0]
    dg = a[1] - b[1]
    db = a[2] - b[2]
    return dr * dr + dg * dg + db * db


def sample_corners(pixels, width: int, height: int) -> Rgb:
    corners = [
        pixels[0, 0][:3],
        pixels[width - 1, 0][:3],
        pixels[0, height - 1][:3],
        pixels[width - 1, height - 1][:3],
    ]
    r = sum(c[0] for c in corners) // 4
    g = sum(c[1] for c in corners) // 4
    b = sum(c[2] for c in corners) // 4
    return (r, g, b)


def edge_positions(width: int, height: int) -> Iterable[Tuple[int, int]]:
    for x in range(width):
        yield (x, 0)
        yield (x, height - 1)
    for y in range(height):
        yield (0, y)
        yield (width - 1, y)


def remove_background(
    input_path: Path, output_path: Path, tolerance: int, background_rgb: Rgb | None
) -> None:
    image = Image.open(input_path).convert("RGBA")
    pixels = image.load()
    width, height = image.size

    if width == 0 or height == 0:
        raise ValueError("Input image is empty")

    bg = (
        background_rgb
        if background_rgb is not None
        else sample_corners(pixels, width, height)
    )
    max_dist_sq = tolerance * tolerance

    visited = [[False for _ in range(height)] for _ in range(width)]
    queue: deque[Tuple[int, int]] = deque()

    for pos in edge_positions(width, height):
        x, y = pos
        if not visited[x][y] and color_distance_sq(pixels[x, y][:3], bg) <= max_dist_sq:
            visited[x][y] = True
            queue.append((x, y))

    while queue:
        x, y = queue.popleft()

        pixels[x, y] = (pixels[x, y][0], pixels[x, y][1], pixels[x, y][2], 0)

        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or nx >= width or ny < 0 or ny >= height:
                continue
            if visited[nx][ny]:
                continue
            if color_distance_sq(pixels[nx, ny][:3], bg) <= max_dist_sq:
                visited[nx][ny] = True
                queue.append((nx, ny))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, format="PNG")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Remove plain background and export transparent PNG"
    )
    parser.add_argument("input", type=Path, help="Input image path (jpg/png/webp)")
    parser.add_argument("output", type=Path, help="Output PNG path")
    parser.add_argument(
        "--tolerance",
        type=int,
        default=35,
        help="Color tolerance (0-255). Higher value removes more background. Default: 35",
    )
    parser.add_argument(
        "--background-rgb",
        type=parse_rgb,
        default=None,
        help="Optional forced background color in form r,g,b (e.g. 240,240,240)",
    )
    args = parser.parse_args()

    if args.tolerance < 0 or args.tolerance > 255:
        parser.error("--tolerance must be in range 0..255")

    remove_background(args.input, args.output, args.tolerance, args.background_rgb)


if __name__ == "__main__":
    main()
