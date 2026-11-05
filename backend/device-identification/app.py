import os
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from google import genai
from google.genai import types


GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY environment variable is not set")

client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI(
    title="Gemini Image Product Identifier",
    description="Upload an image to extract product information using Gemini",
    version="1.0.0",
)


@app.get("/health")
async def health():
    return {"status": "ok"}


def analyze_image(img_bytes: bytes, mime_type: str):
    if len(img_bytes) < 1024:
        raise HTTPException(status_code=400, detail="Image file too small or invalid")

    model = "gemini-2.5-pro"

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(
                    text=(
                        "Analyze this image and determine whether it contains a real, physical device, "
                        "machine, or equipment (e.g. smartphone, laptop, tablet, TV, printer, camera, "
                        "home appliance, power tool, vehicle, medical device, etc.).\n\n"
                        "Set 'device_found' to true ONLY if the image clearly shows a recognizable "
                        "physical product or device. Set it to false if the image contains: "
                        "icons, logos, screenshots, UI elements, abstract graphics, people, animals, "
                        "food, scenery, or anything that is not a physical device or equipment.\n\n"
                        "If device_found is true, fill in the other fields with what you can identify. "
                        "If device_found is false, leave all other fields empty."
                    )
                ),
                types.Part.from_bytes(
                    data=img_bytes,
                    mime_type=mime_type,
                ),
            ],
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=genai.types.Schema(
            type=genai.types.Type.OBJECT,
            required=["device_found"],
            properties={
                "device_found": genai.types.Schema(type=genai.types.Type.BOOLEAN),
                "Product": genai.types.Schema(type=genai.types.Type.STRING),
                "Brand": genai.types.Schema(type=genai.types.Type.STRING),
                "Model": genai.types.Schema(type=genai.types.Type.STRING),
                "ReleaseDate": genai.types.Schema(type=genai.types.Type.STRING),
                "EndOfLifeDate": genai.types.Schema(type=genai.types.Type.STRING),
                "GTIN": genai.types.Schema(type=genai.types.Type.STRING),
            },
        ),
    )

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=generate_content_config,
    )

    result = response.parsed

    if not result.get("device_found", False):
        raise HTTPException(
            status_code=422,
            detail="No physical device or equipment recognized in this image."
        )

    result.pop("device_found", None)
    return result



# API endpoint
#-----------------------------

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    filename = file.filename
    extension = os.path.splitext(filename)[1].lower()

    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".heic": "image/heic",
    }

    mime_type = mime_types.get(extension)
    if not mime_type:
        raise HTTPException(status_code=400, detail=f"Unsupported file extension: {extension}")

    img_bytes = await file.read()

    result = analyze_image(
        img_bytes=img_bytes,
        mime_type=mime_type,
    )

    return result