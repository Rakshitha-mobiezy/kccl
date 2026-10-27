# import cv2
# import numpy as np
# import pytesseract
# import sys
# import json
# from PIL import Image

# # Tesseract installation path
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# def preprocess_and_ocr(image_path):
#     try:
#         # Load image
#         image = cv2.imread(image_path)
#         if image is None:
#             return {"success": False, "error": "Could not load image"}
        
#         # Convert to grayscale
#         gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
#         # Enlarge image (4x scaling)
#         gray = cv2.resize(gray, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
        
#         # Remove some noise
#         gray = cv2.GaussianBlur(gray, (3, 3), 0)
        
#         # Convert to black/white using OTSU
#         threshold_value, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
#         # OCR configuration (exact same as working version)
#         config = "--oem 3 --psm 7 -c tessedit_char_whitelist=0123456789"
#         raw_text = pytesseract.image_to_string(binary, config=config)
        
#         # Extract digits
#         digits = "".join(char for char in raw_text if char.isdigit())
        
#         return {
#             "success": True,
#             "raw_text": raw_text,
#             "digits": digits,
#             "length": len(digits)
#         }
        
#     except Exception as e:
#         return {"success": False, "error": str(e)}

# if __name__ == "__main__":
#     if len(sys.argv) < 2:
#         print('{"success": false, "error": "Usage: python script.py <image_path>"}')
#         sys.exit(1)
    
#     image_path = sys.argv[1]
#     result = preprocess_and_ocr(image_path)
    
#     # Output JSON for Node.js to parse
#     print(json.dumps(result))


import sys, json, re, time
import pytesseract
from PIL import Image
import cv2
import numpy as np

# Uncomment and set your path if needed:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def solve(path):
    # Retry reading the image if Windows locks it temporarily
    img = None
    for _ in range(3):
        try:
            img = cv2.imread(path)
            if img is not None:
                break
        except Exception:
            pass
        time.sleep(0.5)

    if img is None:
        return {"success": False, "error": "image not found or locked"}

    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.copyMakeBorder(gray, 10, 10, 10, 10, cv2.BORDER_CONSTANT, value=[255, 255, 255])
        gray = cv2.resize(gray, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        thresh = cv2.bitwise_not(thresh)

        config = '--psm 6 -c tessedit_char_whitelist=0123456789'
        raw = pytesseract.image_to_string(thresh, config=config).strip()
        digits = re.sub(r'\D', '', raw)

        return {
            "success": True,
            "raw_text": raw,
            "digits": digits,
            "length": len(digits)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "no image path"}))
        sys.exit(0)
    result = solve(sys.argv[1])
    print(json.dumps(result))