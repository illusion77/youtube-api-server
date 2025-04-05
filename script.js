document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const youtubeUrlInput = document.getElementById('youtube-url');
    const languageInput = document.getElementById('language');
    const extractBtn = document.getElementById('extract-btn');
    const copySubtitlesBtn = document.getElementById('copy-subtitles-btn');
    const copyTimestampsBtn = document.getElementById('copy-timestamps-btn');
    const subtitlesOutput = document.getElementById('subtitles-output');
    const timestampsOutput = document.getElementById('timestamps-output');
    const outputSection = document.getElementById('output-section');
    const videoInfoSection = document.getElementById('video-info');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    const copySubtitlesSuccess = document.getElementById('copy-subtitles-success');
    const copyTimestampsSuccess = document.getElementById('copy-timestamps-success');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // API URL - Replace with your deployed Vercel URL when available
    // For local development use: http://localhost:8000/api/
    const API_BASE_URL = '/api/';

    // Extract subtitles from YouTube video
    extractBtn.addEventListener('click', async () => {
        const youtubeUrl = youtubeUrlInput.value.trim();
        const language = languageInput.value.trim();
        
        if (!youtubeUrl) {
            showError('Please enter a YouTube URL');
            return;
        }
        
        if (!isValidYouTubeUrl(youtubeUrl)) {
            showError('Please enter a valid YouTube URL');
            return;
        }
        
        // Clear previous results
        subtitlesOutput.value = '';
        timestampsOutput.innerHTML = '';
        videoInfoSection.innerHTML = '';
        
        // Hide output and error, show loader
        outputSection.style.display = 'none';
        errorMessage.style.display = 'none';
        loader.style.display = 'flex';
        
        try {
            // Get video data
            const videoData = await fetchVideoData(youtubeUrl);
            
            // Get subtitles
            const subtitles = await fetchSubtitles(youtubeUrl, language);
            
            // Get timestamps
            const timestamps = await fetchTimestamps(youtubeUrl, language);
            
            // Display video info
            displayVideoInfo(videoData);
            
            // Display subtitles
            subtitlesOutput.value = subtitles;
            
            // Display timestamps
            displayTimestamps(timestamps, videoData.video_id);
            
            // Hide loader, show output
            loader.style.display = 'none';
            outputSection.style.display = 'block';
            
            // Scroll to output section
            outputSection.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error:', error);
            loader.style.display = 'none';
            showError(error.message || 'An error occurred while fetching subtitles');
        }
    });
    
    // Copy subtitles to clipboard
    copySubtitlesBtn.addEventListener('click', () => {
        copyToClipboard(subtitlesOutput.value, copySubtitlesSuccess);
    });
    
    // Copy timestamps to clipboard
    copyTimestampsBtn.addEventListener('click', () => {
        const text = Array.from(timestampsOutput.querySelectorAll('.timestamp-item'))
            .map(item => item.textContent)
            .join('\n');
        copyToClipboard(text, copyTimestampsSuccess);
    });
    
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            const tabId = button.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Fetch video data from API
    async function fetchVideoData(url) {
        try {
            const response = await fetch(`${API_BASE_URL}video-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });
            
            const data = await response.json();
            
            if (data.status === 'error') {
                throw new Error(data.message || 'Failed to fetch video data');
            }
            
            return data.data;
        } catch (error) {
            throw new Error('Error fetching video data: ' + error.message);
        }
    }
    
    // Fetch subtitles from API
    async function fetchSubtitles(url, language) {
        try {
            const requestBody = {
                url: url,
            };
            
            if (language) {
                requestBody.languages = [language];
            }
            
            const response = await fetch(`${API_BASE_URL}video-captions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            
            const data = await response.json();
            
            if (data.status === 'error') {
                throw new Error(data.message || 'Failed to fetch subtitles');
            }
            
            return data.captions;
        } catch (error) {
            throw new Error('Error fetching subtitles: ' + error.message);
        }
    }
    
    // Fetch timestamps from API
    async function fetchTimestamps(url, language) {
        try {
            const requestBody = {
                url: url,
            };
            
            if (language) {
                requestBody.languages = [language];
            }
            
            const response = await fetch(`${API_BASE_URL}video-timestamps`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            
            const data = await response.json();
            
            if (data.status === 'error') {
                throw new Error(data.message || 'Failed to fetch timestamps');
            }
            
            return data.timestamps;
        } catch (error) {
            throw new Error('Error fetching timestamps: ' + error.message);
        }
    }
    
    // Display video information
    function displayVideoInfo(videoData) {
        videoInfoSection.innerHTML = `
            <img src="${videoData.thumbnail_url}" alt="${videoData.title}" class="video-thumbnail">
            <div class="video-details">
                <div class="video-title">${videoData.title}</div>
                <div class="video-author">
                    <i class="fas fa-user-circle"></i>
                    <a href="${videoData.author_url}" target="_blank">${videoData.author_name}</a>
                </div>
                <div class="video-link">
                    <a href="https://www.youtube.com/watch?v=${videoData.video_id}" target="_blank">
                        <i class="fab fa-youtube"></i> Watch on YouTube
                    </a>
                </div>
            </div>
        `;
    }
    
    // Display timestamps
    function displayTimestamps(timestamps, videoId) {
        timestampsOutput.innerHTML = '';
        
        timestamps.forEach(timestamp => {
            const [time, ...textParts] = timestamp.split(' - ');
            const text = textParts.join(' - ');
            const [minutes, seconds] = time.split(':');
            const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
            
            const timestampItem = document.createElement('div');
            timestampItem.className = 'timestamp-item';
            timestampItem.innerHTML = `
                <a href="https://www.youtube.com/watch?v=${videoId}&t=${totalSeconds}" 
                   target="_blank" 
                   class="timestamp-link"><i class="fas fa-play-circle"></i> ${time}</a> - ${text}
            `;
            
            timestampsOutput.appendChild(timestampItem);
        });
    }
    
    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Scroll to error message
        errorMessage.scrollIntoView({ behavior: 'smooth' });
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    // Copy text to clipboard
    function copyToClipboard(text, successElement) {
        if (!text) {
            showError('No content to copy');
            return;
        }
        
        navigator.clipboard.writeText(text)
            .then(() => {
                // Show success message
                successElement.classList.add('visible');
                
                // Hide success message after 2 seconds
                setTimeout(() => {
                    successElement.classList.remove('visible');
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                showError('Failed to copy to clipboard');
            });
    }
    
    // Validate YouTube URL
    function isValidYouTubeUrl(url) {
        const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        return pattern.test(url);
    }
});