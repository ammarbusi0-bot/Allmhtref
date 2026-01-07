import requests
import os

# إعدادات البوت
TOKEN = "8514221652:AAHJqwBBQybTD8TPm9l8NYVPjLFcxTR8q9w"
# ملاحظة: سنحتاج لجلب الـ Chat ID الخاص بجروبك لاحقاً

def get_messages():
    url = f"https://api.telegram.org/bot{TOKEN}/getUpdates"
    response = requests.get(url).json()
    messages = response.get('result', [])
    
    html_content = ""
    for m in messages[-10:]: # سنأخذ آخر 10 رسائل فقط
        if 'message' in m and 'text' in m['message']:
            user = m['message']['from'].get('first_name', 'مستخدم')
            text = m['message']['text']
            html_content += f'<div class="msg-box"><span class="user">{user}:</span><p>{text}</p></div>\n'
    return html_content

# قراءة ملف index.html وتحديثه
with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

with open("index.html", "w", encoding="utf-8") as f:
    for line in lines:
        if '<div id="content">' in line:
            f.write('<div id="content">\n' + get_messages())
        else:
            f.write(line)
