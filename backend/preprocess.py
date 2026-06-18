"""Image preprocessing to improve OMR success on phone photos.

Targets the common oemer failure on photos — "Unit sizes not consistent" /
ZeroDivisionError in staff-unit detection — which is caused by skew and uneven
lighting. The pipeline straightens the page, evens out illumination, binarizes,
and normalizes resolution so stafflines come out crisp and uniform.
"""

import cv2
import numpy as np


def _deskew_angle(gray):
    """Estimate page skew from near-horizontal lines (stafflines)."""
    thr = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    edges = cv2.Canny(thr, 50, 150)
    min_len = max(50, gray.shape[1] // 3)
    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180, threshold=200, minLineLength=min_len, maxLineGap=20
    )
    if lines is None:
        return 0.0

    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        if abs(angle) < 30:  # only near-horizontal lines count as stafflines
            angles.append(angle)

    return float(np.median(angles)) if angles else 0.0


def preprocess_image(in_path, out_path):
    """Clean up a sheet-music image and write the result to out_path.

    Returns True on success. Raises if the image can't be read.
    """
    img = cv2.imread(in_path)
    if img is None:
        raise ValueError("Could not read the uploaded image.")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Even out shadows / uneven lighting
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Straighten the page so staff spacing is consistent
    angle = _deskew_angle(gray)
    if abs(angle) > 0.3:
        h, w = gray.shape
        center = (w / 2, h / 2)
        rot = cv2.getRotationMatrix2D(center, angle, 1.0)
        gray = cv2.warpAffine(
            gray, rot, (w, h), flags=cv2.INTER_CUBIC, borderValue=255
        )

    # Normalize resolution. oemer runs CPU inference in overlapping patches, so
    # cost scales with pixel count. Clamping width to ~1500 keeps printed scores
    # readable while cutting inference time several-fold versus full-res scans.
    h, w = gray.shape
    TARGET_MIN_W, TARGET_MAX_W = 1000, 1500
    if w < TARGET_MIN_W:
        scale = TARGET_MIN_W / w
        gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
    elif w > TARGET_MAX_W:
        scale = TARGET_MAX_W / w
        gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    # NOTE: deliberately avoid hard binarization / heavy denoising here — both
    # fragment the thin stafflines that oemer relies on to build its staff grid
    # (a frequent cause of "Unit sizes not consistent"). oemer does its own
    # binarization internally, so we hand it a clean, deskewed grayscale image.
    out = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    cv2.imwrite(out_path, out)
    return True
