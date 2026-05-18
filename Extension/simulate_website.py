import urllib.request
import re
import json

def fetch_website_data(url):
    domain = url.split('//')[-1].split('/')[0]
    
    # Fake user agent to avoid blocks
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return
        
    # Regex from our content.js
    email_regex = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    
    emails = list(set(re.findall(email_regex, html)))
    support_emails = [e for e in emails if any(x in e for x in ['support', 'contact', 'help', 'info'])]
    
    # Check for forms and passwords
    has_password = 'type="password"' in html or "type='password'" in html
    
    # Check for privacy and terms
    has_privacy = 'privacy' in html.lower()
    has_terms = 'terms' in html.lower()
    
    # Extract company name from title
    title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
    company_name = title_match.group(1).split('-')[0].split('|')[0].strip() if title_match else domain

    payload = {
        "domain": domain,
        "url": url,
        "companyName": company_name,
        "https": url.startswith("https"),
        "hasPasswordField": has_password,
        "formAction": "/login", # Simplified for python test
        "hasPrivacyPolicy": has_privacy,
        "hasTerms": has_terms,
        "cookieCount": 8, # Browser extension usually provides this
        "trackingCookies": ["_ga", "_fbp"], # Browser extension usually provides this
        "requestedPermissions": [],
        "localStorageCount": 12,
        "sessionStorageCount": 3,
        "supportEmails": support_emails,
        "phoneNumbers": [],
        "socialLinks": [f"https://twitter.com/{domain.split('.')[0]}"]
    }
    
    print(f"--- OUTPUT FOR {url} ---")
    print(json.dumps(payload, indent=2))

if __name__ == "__main__":
    fetch_website_data("https://github.com/login")
    fetch_website_data("https://gitlab.com/users/sign_in")
