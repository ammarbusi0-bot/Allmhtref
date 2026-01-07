
import requests

# التوكن الخاص بك
TOKEN = "8514221652:AAHJqwBBQybTD8TPm9l8NYVPjLFcxTR8q9w"

def get_messages():
    # جلب التحديثات من البوت
    url = f"https://api.telegram.org/bot{TOKEN}/getUpdates"
    try:
        data = requests.get(url).json()
        messages = data.get('result', [])
        
        if not messages:
            return "<p>لا توجد رسائل جديدة حالياً. ارسل رسالة في الجروب لتظهر هنا.</p>"
            
        html_content = ""
        # ترتيب الرسائل من الأحدث للأقدم
        for m in reversed(messages):
            if 'message' in m and 'text' in m['message']:
                user = m['message']['from'].get('first_name', 'عضو')
                text = m['message']['text']
                html_content += f'<div class="msg-box"><span class="user">{user}:</span><p>{text}</p></div>\n'
        return html_content
    except Exception as e:
        return f"<p>خطأ في جلب البيانات: {str(e)}</p>"

# تحديث ملف index.html
with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# استبدال المحتوى القديم بالجديد بين علامتي الـ div
start_tag = '<div id="content">'
end_tag = '</div>'

new_messages_html = get_messages()
parts = content.split(start_tag)
header = parts[0] + start_tag
footer = end_tag + parts[1].split(end_tag)[1]

with open("index.html", "w", encoding="utf-8") as f:
    f.write(header + new_messages_html + footer)
