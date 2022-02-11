#! /usr/bin/python3

# #############################################################################
# Imports
# #############################################################################

import os
import shutil
import json
from PIL import Image
from typing import Tuple, List, Dict


# #############################################################################
# Functions
# #############################################################################

def minimize_images(path_import: str, path_export: str):
    if os.path.exists(f"./{path_export}"):
        shutil.rmtree(f"./{path_export}")

    characters = os.listdir(f"./{path_import}")
    for character in characters:

        os.makedirs(path_export_character := f"./{path_export}/{character}")
        if os.path.isdir(path_import_character := f"./{path_import}/{character}"):

            print(f"==== character : {character} ====")
            character_files = os.listdir(path_import_character)

            # Scan
            files = []
            folders = []
            for file in character_files:

                path_file = f"{path_import_character}/{file}"
                if os.path.isdir(path_file):
                    folders.append(path_file)

                else:
                    files.append(path_file)

            # Export
            base: dict = {}
            for mood, model in map(lambda path: simple_crop(path), files):
                base[mood] = [model]
                continue

            for moods, model in map(lambda path: multiple_crop(path), folders):
                for mood in moods:
                    base[mood].append(model)
                continue

            base["default"] = list(base.keys())[0]
            with open(f"{path_export_character}/base.json", "wt") as file:
                json.dump(base, file, indent=2)
                print(base)


def pack_images(path: str):

    characters = os.listdir(f"./{path}")
    for character in characters:

        path_import_character = f"./{path}/{character}"
        character_files = os.listdir(path_import_character)

        files = []
        folders = []
        for file in character_files:

            path_file = f"{path_import_character}/{file}"
            if os.path.isdir(path_file):
                folders.append(path_file)
            elif file.endswith(".png"):
                files.append(path_file)

        for file in files:
            name = "/".join([path_import_character, file.split("/")[-1].split(".")[0]])
            print(name)
            cmd = f"TexturePacker " \
                  f"--max-size 8192 " \
                  f"--texture-format png " \
                  f"--sheet {name}.png " \
                  f"--data {name}.json " \
                  f"--format pixijs4 {name}.png"
            os.system(cmd)

        for folder in folders:
            name = "/".join([path_import_character, folder.split("/")[-1]])
            print(name)
            cmd = f"TexturePacker " \
                  f"--max-size 8192 " \
                  f"--texture-format png " \
                  f"--sheet {name}.png " \
                  f"--data {name}.json " \
                  f"--format pixijs4 {name}"
            os.system(cmd)


def convert_pixels(image: Image):
    n_row, n_col = image.size
    for r in range(0, n_row):
        for c in range(0, n_col):
            p = image.getpixel((r, c))
            if p[3] == 0:
                image.putpixel((r, c), (0, 0, 0, 0))


def simple_crop(path_import: str) -> Tuple[str, Dict]:
    name = (path_export_list := path_import.split("/"))[-1].split(".")[0]
    path_export = f"./export/{'/'.join(path_export_list[2:-1])}/b_{name}.png"

    with Image.open(path_import) as image:
        # convert_pixels(image)
        xm, ym, xM, yM = image.getbbox()
        box = (xm, ym, xM, yM)
        im2 = image.crop(box)
        export(path_export, im2)

        return name, {
            "model": "b_" + name,
            "x": xm + (xM - xm) / 2,
            "y": ym + (yM - ym) / 2
        }


def multiple_crop(path_import: str) -> Tuple[List, Dict]:
    name, moods = (path_export_list := path_import.split("/"))[-1].split("_", 2)
    moods = moods.split("-")
    name = name + "".join(map(lambda mood: str(mood[:2]).capitalize(), moods))
    path_export = f"./export/{'/'.join(path_export_list[2:-1])}/p_{name}"

    # Find images box
    x_min, x_max = 1920, 0
    y_min, y_max = 1920, 0
    (paths_file := os.listdir(path_import)).sort()
    paths_import = list(map(lambda file: f"{path_import}/{file}", paths_file))
    i, i_max = 0, len(paths_import)
    for path in paths_import:
        with Image.open(path) as image:
            convert_pixels(image)
            xm, ym, xM, yM = image.getbbox()
            x_min = xm if xm < x_min else x_min
            y_min = ym if ym < y_min else y_min
            x_max = xM if xM > x_max else x_max
            y_max = yM if yM > y_max else y_max
        i += 1
        print(f"\r{i}/{i_max} processed on {path}                           ", end="")
    box = (x_min, y_min, x_max, y_max)
    #print(box)

    # crop images
    os.makedirs(path_export)

    i = 0
    for path in paths_import:
        with Image.open(path) as image:
            im2 = image.crop(box)
            print(_path := f"\r{i}/{i_max} {path} saved                        ", end="")
            export(f"{path_export}/{name}{i:0>4d}.png", im2)
        i += 1

    print(f"\r{path_export} done                                                          ")

    return moods, {
        "model": "p_" + name,
        "x": x_min + (x_max - x_min) / 2,
        "y": y_min + (y_max - y_min) / 2
    }


def export(path: str, image: Image):
    image.save(path)


# #############################################################################
# Main
# #############################################################################

if __name__ == "__main__":

    minimize_images("sources", "export")

    pack_images("export")
