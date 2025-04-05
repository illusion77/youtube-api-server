from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from mangum import Mangum
import sys
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import YouTube tools
try:
    from youtube_tools import YouTubeTools
except ImportError as e:
    logger.error(f"Error importing YouTubeTools: {e}")
    raise

app = FastAPI(title="YouTube Tools API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class YouTubeRequest(BaseModel):
    url: str
    languages: Optional[List[str]] = None

@app.get("/")
async def root():
    return {"message": "YouTube Tools API is running"}

@app.post("/video-data")
async def get_video_data(request: YouTubeRequest):
    """Endpoint to get video metadata"""
    try:
        return YouTubeTools.get_video_data(request.url)
    except Exception as e:
        logger.error(f"Error in video-data endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/video-captions")
async def get_video_captions(request: YouTubeRequest):
    """Endpoint to get video captions"""
    try:
        return YouTubeTools.get_video_captions(request.url, request.languages)
    except Exception as e:
        logger.error(f"Error in video-captions endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/video-timestamps")
async def get_video_timestamps(request: YouTubeRequest):
    """Endpoint to get video timestamps"""
    try:
        return YouTubeTools.get_video_timestamps(request.url, request.languages)
    except Exception as e:
        logger.error(f"Error in video-timestamps endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Create handler for AWS Lambda / Vercel
handler = Mangum(app)

# Vercel specific handler
def vercel_handler(event, context):
    try:
        return handler(event, context)
    except Exception as e:
        logger.error(f"Error in handler: {e}")
        raise