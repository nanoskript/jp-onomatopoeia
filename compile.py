import csv
import dataclasses
import glob
import json
import re
from collections import defaultdict
from itertools import islice
from pathlib import Path
from typing import Optional


@dataclasses.dataclass()
class RawEntry:
    katakana: str
    english: str
    details: Optional[str]


def compile_nihongoresources_com(entries: list[RawEntry]):
    with open(Path("data") / "nihongoresources.com" / "giongo.txt") as f:
        for line in f.readlines()[1:]:
            [_katakana, katakana, translation, *details] = line.split("\t")
            entries.append(RawEntry(
                katakana=katakana,
                english=translation,
                details=", ".join(details).strip(),
            ))


def compile_japanese_manga_sfx_sheet(entries: list[RawEntry]):
    pattern = Path("data") / "japanese-manga-sfx" / "*.csv"
    for file in glob.glob(str(pattern)):
        with open(file) as f:
            # Structured with two header rows.
            rows = list(csv.reader(f))

            # Find all columns of entries.
            katakana_columns = []
            for index, cell in enumerate(rows[1]):
                if cell == "Japanese":
                    katakana_columns.append(index)

            # Compile each column.
            new_entries = []
            for index in katakana_columns:
                katakana, english, details = None, "", ""
                for row_index, row in islice(enumerate(rows), 2, None):
                    if row[index + 1].strip():
                        # Assume each romaji row starts a new entry.
                        if katakana is not None:
                            new_entries.append(RawEntry(katakana, english, details))
                            english, details = "", ""
                        katakana = row[index].removesuffix(",")

                    # Append text to existing entry.
                    english += row[index + 2] + " "
                    details += row[index + 3] + " "

                # Some columns have no entries.
                if katakana is not None:
                    new_entries.append(RawEntry(katakana, english, details))

            # Refine new entries.
            for entry in new_entries:
                # Normalize english.
                english = entry.english
                english = re.sub(r"\s+", " ", english.strip())

                # Normalize details.
                details = entry.details
                details = details.replace("More »", "")
                details = re.sub(r"\s+", " ", details.strip())

                # Consider numbering.
                english_split = re.split(r"\((\d+)\)", english)
                if len(english_split) == 1:
                    # No numbering.
                    entries.append(RawEntry(entry.katakana, english, details or None))
                    continue

                details_items = {}
                details_split = re.split(r"\((\d+)\)", details)
                for index, string in enumerate(details_split):
                    if string.isdigit():
                        value = details_split[index + 1]
                        value = value.strip().removesuffix(";")
                        details_items[int(string)] = value

                for index, string in enumerate(english_split):
                    if string.isdigit():
                        english = english_split[index + 1]
                        english = english.strip().removesuffix(";")
                        details = details_items.get(int(string), None)
                        entries.append(RawEntry(entry.katakana, english, details))


def compile_raw_entries() -> list[RawEntry]:
    entries = []
    compile_nihongoresources_com(entries)
    compile_japanese_manga_sfx_sheet(entries)
    return entries


def compile_entries(raw_entries: list[RawEntry]):
    entries = defaultdict(list)
    for entry in raw_entries:
        entries[entry.katakana].append({
            "english": entry.english,
            "details": entry.details,
        })
    return entries


def main():
    raw_entries = compile_raw_entries()
    entries = compile_entries(raw_entries)
    with open("onomatopoeia.json", "w") as f:
        json.dump(entries, f, indent=2)


if __name__ == '__main__':
    main()
