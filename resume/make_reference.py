import re
import subprocess
import sys
import zipfile
from collections.abc import Callable
from pathlib import Path

INK = "1B1B1F"
MUTED = "5C6370"
RULE = "C4C8CF"
ACCENT = "1F4F8F"
FONT = "Arial"
LIST_FONTS = ("Symbol", "Courier New", "Wingdings")
BODY_SIZE = 19
ROLE_SIZE = 20
DATES_SIZE = 18
SECTION_SIZE = 20
NAME_SIZE = 36
PAGE_WIDTH = 12240
SIDE_MARGIN = 792
TEXT_WIDTH = PAGE_WIDTH - 2 * SIDE_MARGIN
BODY_LINE = 230
ROLE_LINE = 260
DATES_LINE = 230
COMPACT_AFTER = 20
SECTION_BEFORE = 140
ROLE_BEFORE = 100

FONTS = (
    f'<w:rFonts w:ascii="{FONT}" w:hAnsi="{FONT}" w:eastAsia="{FONT}" w:cs="{FONT}" />'
)


def size(half_points: int) -> str:
    return f'<w:sz w:val="{half_points}" /><w:szCs w:val="{half_points}" />'


def paragraph_style(
    style_id: str,
    name: str,
    ppr: str,
    rpr: str = "",
    based_on: str | None = "Normal",
    next_style: str | None = None,
    link: str | None = None,
    custom: bool = False,
    extra: str = "",
) -> str:
    return (
        f'<w:style w:type="paragraph"{' w:customStyle="1"' if custom else ""} w:styleId="{style_id}">'
        f'<w:name w:val="{name}" />'
        + (f'<w:basedOn w:val="{based_on}" />' if based_on else "")
        + (f'<w:next w:val="{next_style}" />' if next_style else "")
        + (f'<w:link w:val="{link}" />' if link else "")
        + extra
        + "<w:qFormat />"
        + f"<w:pPr>{ppr}</w:pPr>"
        + (f"<w:rPr>{rpr}</w:rPr>" if rpr else "")
        + "</w:style>"
    )


def character_style(
    style_id: str, name: str, rpr: str, link: str | None = None, extra: str = ""
) -> str:
    return (
        f'<w:style w:type="character" w:customStyle="1" w:styleId="{style_id}">'
        f'<w:name w:val="{name}" /><w:basedOn w:val="DefaultParagraphFont" />'
        + (f'<w:link w:val="{link}" />' if link else "")
        + extra
        + f"<w:rPr>{rpr}</w:rPr></w:style>"
    )


HEADING_EXTRA = '<w:uiPriority w:val="9" />'

NAME_RPR = f'{FONTS}<w:b /><w:bCs /><w:color w:val="{INK}" /><w:kern w:val="28" />{size(NAME_SIZE)}'
SECTION_RPR = f'{FONTS}<w:b /><w:bCs /><w:caps /><w:color w:val="{ACCENT}" /><w:spacing w:val="16" />{size(SECTION_SIZE)}'
ROLE_RPR = f'{FONTS}<w:color w:val="{INK}" />{size(ROLE_SIZE)}'
DATES_RPR = f'<w:color w:val="{MUTED}" />{size(DATES_SIZE)}'

STYLES: dict[str, str] = {
    "Normal": (
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal" /><w:qFormat />'
        f'<w:pPr><w:widowControl /><w:spacing w:before="0" w:after="0" w:line="{BODY_LINE}" w:lineRule="exact" /></w:pPr>'
        f'<w:rPr>{FONTS}<w:color w:val="{INK}" />{size(BODY_SIZE)}<w:lang w:val="en-US" /></w:rPr></w:style>'
    ),
    "BodyText": paragraph_style(
        "BodyText",
        "Body Text",
        '<w:spacing w:before="0" w:after="60" />',
        link="BodyTextChar",
    ),
    "FirstParagraph": paragraph_style(
        "FirstParagraph",
        "First Paragraph",
        "",
        based_on="BodyText",
        next_style="BodyText",
        custom=True,
    ),
    "Compact": paragraph_style(
        "Compact",
        "Compact",
        f'<w:spacing w:before="0" w:after="{COMPACT_AFTER}" />',
        based_on="BodyText",
        custom=True,
    ),
    "Title": paragraph_style(
        "Title",
        "Title",
        '<w:keepNext /><w:keepLines /><w:spacing w:before="0" w:after="40" w:line="240" w:lineRule="auto" />',
        NAME_RPR,
        next_style="BodyText",
        link="TitleChar",
        extra='<w:uiPriority w:val="10" />',
    ),
    "Heading1": paragraph_style(
        "Heading1",
        "heading 1",
        '<w:keepNext /><w:keepLines /><w:spacing w:before="0" w:after="40" w:line="240" w:lineRule="auto" /><w:outlineLvl w:val="0" />',
        NAME_RPR,
        next_style="BodyText",
        link="Heading1Char",
        extra=HEADING_EXTRA,
    ),
    "Heading2": paragraph_style(
        "Heading2",
        "heading 2",
        "<w:keepNext /><w:keepLines />"
        f'<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="{RULE}" /></w:pBdr>'
        f'<w:spacing w:before="{SECTION_BEFORE}" w:after="60" w:line="240" w:lineRule="auto" /><w:outlineLvl w:val="1" />',
        SECTION_RPR,
        next_style="BodyText",
        link="Heading2Char",
        extra=HEADING_EXTRA,
    ),
    "Heading3": paragraph_style(
        "Heading3",
        "heading 3",
        f'<w:keepNext /><w:keepLines /><w:tabs><w:tab w:val="right" w:pos="{TEXT_WIDTH}" /></w:tabs>'
        f'<w:spacing w:before="{ROLE_BEFORE}" w:after="0" w:line="{ROLE_LINE}" w:lineRule="exact" /><w:outlineLvl w:val="2" />',
        ROLE_RPR,
        next_style="Dates",
        link="Heading3Char",
        extra=HEADING_EXTRA,
    ),
    "Dates": paragraph_style(
        "Dates",
        "Dates",
        f'<w:keepNext /><w:keepLines /><w:spacing w:before="0" w:after="30" w:line="{DATES_LINE}" w:lineRule="exact" />',
        DATES_RPR,
        based_on="BodyText",
        next_style="Compact",
        custom=True,
    ),
    "RoleDates": character_style("RoleDates", "Role Dates", DATES_RPR),
    "TitleChar": character_style("TitleChar", "Title Char", NAME_RPR, link="Title"),
    "Heading1Char": character_style(
        "Heading1Char", "Heading 1 Char", NAME_RPR, link="Heading1", extra=HEADING_EXTRA
    ),
    "Heading2Char": character_style(
        "Heading2Char",
        "Heading 2 Char",
        SECTION_RPR,
        link="Heading2",
        extra=HEADING_EXTRA,
    ),
    "Heading3Char": character_style(
        "Heading3Char", "Heading 3 Char", ROLE_RPR, link="Heading3", extra=HEADING_EXTRA
    ),
    "Hyperlink": (
        '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink" />'
        '<w:basedOn w:val="BodyTextChar" /><w:uiPriority w:val="99" /><w:unhideWhenUsed />'
        f'<w:rPr><w:color w:val="{ACCENT}" /><w:u w:val="none" /></w:rPr></w:style>'
    ),
}

DOC_DEFAULTS = (
    f"<w:docDefaults><w:rPrDefault><w:rPr>{FONTS}{size(BODY_SIZE)}"
    '<w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="ar-SA" /></w:rPr></w:rPrDefault>'
    '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto" /></w:pPr></w:pPrDefault>'
    "</w:docDefaults>"
)

SECTION = (
    f'<w:pgSz w:w="{PAGE_WIDTH}" w:h="15840" />'
    f'<w:pgMar w:top="720" w:right="{SIDE_MARGIN}" w:bottom="576" w:left="{SIDE_MARGIN}" w:header="360" w:footer="360" w:gutter="0" />'
    '<w:cols w:space="720" />'
)

COMPAT = (
    "<w:compat>"
    '<w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15" />'
    '<w:compatSetting w:name="overrideTableStyleFontSizeAndJustification" w:uri="http://schemas.microsoft.com/office/word" w:val="1" />'
    '<w:compatSetting w:name="enableOpenTypeFeatures" w:uri="http://schemas.microsoft.com/office/word" w:val="1" />'
    '<w:compatSetting w:name="doNotFlipMirrorIndents" w:uri="http://schemas.microsoft.com/office/word" w:val="1" />'
    "</w:compat>"
)


def style_pattern(style_id: str) -> re.Pattern[str]:
    return re.compile(rf'<w:style [^>]*w:styleId="{style_id}"[^>]*>.*?</w:style>', re.S)


def put_style(styles: str, item: tuple[str, str]) -> str:
    style_id, block = item
    pattern = style_pattern(style_id)
    if pattern.search(styles):
        return pattern.sub(lambda _: block, styles, count=1)
    return styles.replace("</w:styles>", block + "</w:styles>")


def restyle(styles: str) -> str:
    unthemed = re.sub(r"<w:rFonts [^>]*/>", FONTS, styles)
    with_defaults = re.sub(
        r"<w:docDefaults>.*?</w:docDefaults>", DOC_DEFAULTS, unthemed, flags=re.S
    )
    recolored = re.sub(
        r'<w:color w:val="[0-9A-Fa-f]{6}"[^>]*/>',
        f'<w:color w:val="{INK}" />',
        with_defaults,
    )
    result = recolored
    for item in STYLES.items():
        result = put_style(result, item)
    return result


def resection(document: str) -> str:
    stripped = re.sub(r"<w:(pgSz|pgMar|cols) [^>]*/>", "", document)
    return re.sub(
        r"(<w:sectPr>.*?</w:footnotePr>)",
        lambda m: m.group(1) + SECTION,
        stripped,
        count=1,
        flags=re.S,
    )


def recompat(settings: str) -> str:
    stripped = re.sub(
        r"<w:compat>.*?</w:compat>|<w:compat />", "", settings, flags=re.S
    )
    return re.sub(r"(<w:rsids)", COMPAT + r"\1", stripped, count=1)


def retheme(theme: str) -> str:
    unscripted = re.sub(r'<a:font script="[^"]*" typeface="[^"]*"\s*/>', "", theme)
    return re.sub(
        r'<a:latin typeface="[^"]*"[^>]*/>',
        f'<a:latin typeface="{FONT}" />',
        unscripted,
    )


def font_entry(name: str) -> str:
    charset = "02" if name in ("Symbol", "Wingdings") else "00"
    return f'<w:font w:name="{name}"><w:charset w:val="{charset}" /></w:font>'


def refont_table(table: str) -> str:
    entries = "".join(font_entry(name) for name in (FONT, *LIST_FONTS))
    return re.sub(
        r"(<w:fonts [^>]*>).*(</w:fonts>)",
        lambda m: m.group(1) + entries + m.group(2),
        table,
        flags=re.S,
    )


EDITS: dict[str, Callable[[str], str]] = {
    "word/theme/theme1.xml": retheme,
    "word/fontTable.xml": refont_table,
    "word/styles.xml": restyle,
    "word/document.xml": resection,
    "word/settings.xml": recompat,
}


def build(out: Path) -> None:
    default = subprocess.run(
        ["pandoc", "--print-default-data-file", "reference.docx"],
        check=True,
        capture_output=True,
    ).stdout
    tmp = out.with_suffix(".tmp")
    source = out.with_suffix(".default.docx")
    source.write_bytes(default)
    with (
        zipfile.ZipFile(source) as zin,
        zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout,
    ):
        for info in zin.infolist():
            data = zin.read(info.filename)
            edit = EDITS.get(info.filename)
            zout.writestr(
                info, edit(data.decode("utf-8")).encode("utf-8") if edit else data
            )
    source.unlink()
    tmp.replace(out)


if __name__ == "__main__":
    build(Path(sys.argv[1]))
    print("built", sys.argv[1])
