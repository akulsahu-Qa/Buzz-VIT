import requests
import json

files = {'fileToUpload': open('test_upload.py', 'rb')}
r = requests.post('https://nostr.build/api/v2/upload/files', files=files)
print(r.status_code)
print(r.text)
