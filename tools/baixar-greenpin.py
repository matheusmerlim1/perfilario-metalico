"""Baixa as páginas de produto e de categoria de www.greenpin.com/br para .cache/greenpin (uso: python tools/baixar-greenpin.py)."""
import os, re, time, urllib.request
D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.cache', 'greenpin')
os.makedirs(D, exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
def get(url, dst):
    if os.path.exists(dst) and os.path.getsize(dst) > 1000: return
    for tent in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                open(dst, 'wb').write(r.read()); break
        except Exception as e:
            print('ERR', url, e); time.sleep(3)
    time.sleep(0.6)
get('https://www.greenpin.com/sitemap.xml', os.path.join(D, 'sitemap.xml'))
urls = [u for u in re.findall(r'<loc>([^<]+)</loc>', open(os.path.join(D, 'sitemap.xml'), encoding='utf-8').read()) if '/br/' in u]
os.makedirs(os.path.join(D, 'cat'), exist_ok=True); os.makedirs(os.path.join(D, 'prod'), exist_ok=True)
for u in urls:
    if '/br/products/' in u: get(u, os.path.join(D, 'cat', u.rstrip('/').split('/')[-1] + '.html'))
    elif '/br/product/' in u: get(u, os.path.join(D, 'prod', u.rstrip('/').split('/')[-1] + '.html'))
# páginas de categoria podem ser paginadas
for f in os.listdir(os.path.join(D, 'cat')):
    s = open(os.path.join(D, 'cat', f), encoding='utf-8', errors='replace').read()
    for m in set(re.findall(r'href="(/br/products/[^"?#]+\?page=\d+)"', s)):
        get('https://www.greenpin.com' + m.replace('&amp;', '&'), os.path.join(D, 'cat', f[:-5] + '__' + m.split('=')[-1] + '.html'))
print(len(os.listdir(os.path.join(D, 'cat'))), 'cat', len(os.listdir(os.path.join(D, 'prod'))), 'prod')
