"""Allow-list for chat files: extension, declared MIME type and file signature must all agree.

Anything not listed (HTML, SVG, scripts, executables, archives) is rejected.
"""
from __future__ import annotations

from dataclasses import dataclass

HEAD_BYTES = 4096

IMAGE, VIDEO, AUDIO, FILE = "image", "video", "audio", "file"
MEDIA_CATEGORIES = (VIDEO, AUDIO)
INLINE_CATEGORIES = (IMAGE, VIDEO, AUDIO)


@dataclass(frozen=True)
class Kind:
    category: str
    content_type: str
    extensions: tuple[str, ...]
    mimes: tuple[str, ...]
    signature: str


def _ftyp_brand(head: bytes) -> bytes | None:
    if len(head) >= 12 and head[4:8] == b"ftyp":
        return head[8:12]
    return None


def _is_text(head: bytes) -> bool:
    if b"\x00" in head:
        return False
    try:
        head.decode("utf-8")
    except UnicodeDecodeError as exc:
        # A multi-byte character may be cut at the end of the sniffed prefix.
        if exc.start < len(head) - 3:
            return False
    return True


_HEIF_BRANDS = {b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1", b"heis", b"heim"}
_AUDIO_MP4_BRANDS = {b"M4A ", b"M4B "}
_QT_BRANDS = {b"qt  "}


def _matches(signature: str, head: bytes) -> bool:
    brand = _ftyp_brand(head)
    if signature == "jpeg":
        return head.startswith(b"\xff\xd8\xff")
    if signature == "png":
        return head.startswith(b"\x89PNG\r\n\x1a\n")
    if signature == "gif":
        return head.startswith((b"GIF87a", b"GIF89a"))
    if signature == "webp":
        return head[:4] == b"RIFF" and head[8:12] == b"WEBP"
    if signature == "heif":
        return brand in _HEIF_BRANDS
    if signature == "mp4":
        return brand is not None and brand not in _HEIF_BRANDS and brand not in _AUDIO_MP4_BRANDS
    if signature == "m4a":
        return brand is not None and brand not in _HEIF_BRANDS and brand not in _QT_BRANDS
    if signature == "ebml":
        return head.startswith(b"\x1a\x45\xdf\xa3")
    if signature == "mp3":
        return head.startswith(b"ID3") or (len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)
    if signature == "ogg":
        return head.startswith(b"OggS")
    if signature == "wav":
        return head[:4] == b"RIFF" and head[8:12] == b"WAVE"
    if signature == "pdf":
        return head.startswith(b"%PDF-")
    if signature == "zip":
        return head.startswith(b"PK\x03\x04")
    if signature == "ole":
        return head.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
    if signature == "text":
        return _is_text(head)
    return False


KINDS: tuple[Kind, ...] = (
    Kind(IMAGE, "image/jpeg", (".jpg", ".jpeg"), ("image/jpeg", "image/pjpeg"), "jpeg"),
    Kind(IMAGE, "image/png", (".png",), ("image/png",), "png"),
    Kind(IMAGE, "image/gif", (".gif",), ("image/gif",), "gif"),
    Kind(IMAGE, "image/webp", (".webp",), ("image/webp",), "webp"),
    Kind(VIDEO, "video/mp4", (".mp4", ".m4v"), ("video/mp4", "video/x-m4v"), "mp4"),
    Kind(VIDEO, "video/quicktime", (".mov",), ("video/quicktime",), "mp4"),
    Kind(VIDEO, "video/webm", (".webm",), ("video/webm",), "ebml"),
    Kind(AUDIO, "audio/mpeg", (".mp3",), ("audio/mpeg", "audio/mp3"), "mp3"),
    Kind(AUDIO, "audio/mp4", (".m4a",), ("audio/mp4", "audio/x-m4a", "audio/m4a"), "m4a"),
    Kind(AUDIO, "audio/ogg", (".ogg", ".oga", ".opus"), ("audio/ogg", "audio/opus"), "ogg"),
    Kind(AUDIO, "audio/webm", (".weba",), ("audio/webm",), "ebml"),
    Kind(AUDIO, "audio/wav", (".wav",), ("audio/wav", "audio/x-wav", "audio/wave"), "wav"),
    Kind(FILE, "image/heic", (".heic", ".heif"), ("image/heic", "image/heif", "image/heic-sequence"), "heif"),
    Kind(FILE, "application/pdf", (".pdf",), ("application/pdf",), "pdf"),
    Kind(
        FILE,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        (".docx",),
        ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",),
        "zip",
    ),
    Kind(
        FILE,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        (".xlsx",),
        ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",),
        "zip",
    ),
    Kind(
        FILE,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        (".pptx",),
        ("application/vnd.openxmlformats-officedocument.presentationml.presentation",),
        "zip",
    ),
    Kind(FILE, "application/msword", (".doc",), ("application/msword",), "ole"),
    Kind(FILE, "application/vnd.ms-excel", (".xls",), ("application/vnd.ms-excel",), "ole"),
    Kind(FILE, "application/vnd.ms-powerpoint", (".ppt",), ("application/vnd.ms-powerpoint",), "ole"),
    Kind(FILE, "text/csv", (".csv",), ("text/csv", "application/vnd.ms-excel", "text/plain"), "text"),
    Kind(FILE, "text/plain", (".txt",), ("text/plain",), "text"),
)

# Browsers often send an empty or generic type for less common files.
_GENERIC_MIMES = {"", "application/octet-stream"}


def _extension(filename: str) -> str:
    name = filename.lower()
    dot = name.rfind(".")
    return name[dot:] if dot > 0 else ""


def _normalize_mime(content_type: str) -> str:
    return (content_type or "").split(";", 1)[0].strip().lower()


def kind_for(filename: str, content_type: str) -> Kind | None:
    """Pick the allowed kind from extension + declared type, before any bytes are read."""
    ext = _extension(filename)
    mime = _normalize_mime(content_type)
    for kind in KINDS:
        if ext in kind.extensions and (mime in kind.mimes or mime in _GENERIC_MIMES):
            return kind
    return None


def signature_ok(kind: Kind, head: bytes) -> bool:
    return bool(head) and _matches(kind.signature, head[:HEAD_BYTES])


def max_bytes(kind: Kind, max_doc: int, max_media: int) -> int:
    return max_media if kind.category in MEDIA_CATEGORIES else max_doc


def accept_list() -> list[str]:
    """Value for <input type=file accept=...>."""
    out: list[str] = []
    for kind in KINDS:
        out.extend(kind.extensions)
    return sorted(set(out))
