import json
import os
from urllib.parse import urlparse, parse_qs, urlencode
from urllib.request import urlopen
from typing import Optional, List
import logging

from fastapi import HTTPException

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lazy import to avoid initial cold start performance hit
YouTubeTranscriptApi = None

def import_transcript_api():
    """Dynamically import the YouTubeTranscriptApi module."""
    global YouTubeTranscriptApi
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        return True
    except ImportError as e:
        logger.error(f"Error importing YouTubeTranscriptApi: {e}")
        return False

class YouTubeTools:
    @staticmethod
    def get_youtube_video_id(url: str) -> Optional[str]:
        """Function to get the video ID from a YouTube URL."""
        try:
            parsed_url = urlparse(url)
            hostname = parsed_url.hostname

            if hostname == "youtu.be":
                return parsed_url.path[1:]
            if hostname in ("www.youtube.com", "youtube.com"):
                if parsed_url.path == "/watch":
                    query_params = parse_qs(parsed_url.query)
                    return query_params.get("v", [None])[0]
                if parsed_url.path.startswith("/embed/"):
                    return parsed_url.path.split("/")[2]
                if parsed_url.path.startswith("/v/"):
                    return parsed_url.path.split("/")[2]
            return None
        except Exception as e:
            logger.error(f"Error getting YouTube video ID: {e}")
            return None

    @staticmethod
    def get_video_data(url: str) -> dict:
        """Function to get video data from a YouTube URL."""
        if not url:
            raise HTTPException(status_code=400, detail="No URL provided")

        try:
            video_id = YouTubeTools.get_youtube_video_id(url)
            if not video_id:
                raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        except Exception as e:
            logger.error(f"Error getting video ID: {e}")
            raise HTTPException(status_code=400, detail="Error getting video ID from URL")

        try:
            params = {"format": "json", "url": f"https://www.youtube.com/watch?v={video_id}"}
            oembed_url = "https://www.youtube.com/oembed"
            query_string = urlencode(params)
            full_url = oembed_url + "?" + query_string

            with urlopen(full_url) as response:
                response_text = response.read()
                video_data = json.loads(response_text.decode())
                clean_data = {
                    "title": video_data.get("title"),
                    "author_name": video_data.get("author_name"),
                    "author_url": video_data.get("author_url"),
                    "type": video_data.get("type"),
                    "height": video_data.get("height"),
                    "width": video_data.get("width"),
                    "version": video_data.get("version"),
                    "provider_name": video_data.get("provider_name"),
                    "provider_url": video_data.get("provider_url"),
                    "thumbnail_url": video_data.get("thumbnail_url"),
                }
                return clean_data
        except Exception as e:
            logger.error(f"Error getting video data: {e}")
            raise HTTPException(status_code=500, detail=f"Error getting video data: {str(e)}")

    @staticmethod
    def get_video_captions(url: str, languages: Optional[List[str]] = None) -> str:
        """Get captions from a YouTube video."""
        if not url:
            raise HTTPException(status_code=400, detail="No URL provided")

        # Import the transcript API
        if not import_transcript_api() or not YouTubeTranscriptApi:
            raise HTTPException(status_code=500, detail="Could not import YouTubeTranscriptApi")

        try:
            video_id = YouTubeTools.get_youtube_video_id(url)
            if not video_id:
                raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        except Exception as e:
            logger.error(f"Error getting video ID: {e}")
            raise HTTPException(status_code=400, detail="Error getting video ID from URL")

        try:
            captions = None
            if languages:
                captions = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
            else:
                captions = YouTubeTranscriptApi.get_transcript(video_id)
            
            if captions:
                return " ".join(line["text"] for line in captions)
            return "No captions found for video"
        except Exception as e:
            logger.error(f"Error getting captions: {e}")
            raise HTTPException(status_code=500, detail=f"Error getting captions for video: {str(e)}")

    @staticmethod
    def get_video_timestamps(url: str, languages: Optional[List[str]] = None) -> List[str]:
        """Generate timestamps for a YouTube video based on captions."""
        if not url:
            raise HTTPException(status_code=400, detail="No URL provided")

        # Import the transcript API
        if not import_transcript_api() or not YouTubeTranscriptApi:
            raise HTTPException(status_code=500, detail="Could not import YouTubeTranscriptApi")

        try:
            video_id = YouTubeTools.get_youtube_video_id(url)
            if not video_id:
                raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        except Exception as e:
            logger.error(f"Error getting video ID: {e}")
            raise HTTPException(status_code=400, detail="Error getting video ID from URL")

        try:
            captions = YouTubeTranscriptApi.get_transcript(video_id, languages=languages or ["en"])
            timestamps = []
            for line in captions:
                start = int(line["start"])
                minutes, seconds = divmod(start, 60)
                timestamps.append(f"{minutes}:{seconds:02d} - {line['text']}")
            return timestamps
        except Exception as e:
            logger.error(f"Error generating timestamps: {e}")
            raise HTTPException(status_code=500, detail=f"Error generating timestamps: {str(e)}")