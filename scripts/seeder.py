import requests
import time
import random

API_URL = "http://127.0.0.1:8000/api/analyze"

payloads = [
    # 1. Critical risk - ngrok
    {
      'meta': {'employeeId':'E001','employeeEmail':'bob@corp.com','department':'Sales','detectedAt':'2026-05-18T12:00:00'},
      'site': {'domain':'ngrok.io','url':'https://ngrok.io/login','isLoginPage':True,'https':True,'hasPasswordField':True,'hasPrivacyPolicy':False,'hasTerms':False,'hasCookieBanner':False},
      'dataFootprint': {'cookieCount':10,'trackingCookies':['_ga', '_fbp'],'trackingCookieCount':2,'localStorageCount':15,'sessionStorageCount':0},
      'permissions': {'requestedPermissions':[],'permissionCount':0,'hasCameraAccess':True,'hasMicAccess':False,'hasLocationAccess':False},
      'vendorInfo': {'supportEmails':[],'phoneNumbers':[],'socialLinks':[],'hasContactInfo':False,'socialLinkCount':0}
    },
    # 2. Approved tool - slack
    {
      'meta': {'employeeId':'E002','employeeEmail':'alice@corp.com','department':'Engineering','detectedAt':'2026-05-18T10:30:00'},
      'site': {'domain':'slack.com','url':'https://slack.com/login','isLoginPage':True,'https':True,'hasPasswordField':True,'hasPrivacyPolicy':True,'hasTerms':True,'hasCookieBanner':True},
      'dataFootprint': {'cookieCount':5,'trackingCookies':[],'trackingCookieCount':0,'localStorageCount':2,'sessionStorageCount':1},
      'permissions': {'requestedPermissions':[],'permissionCount':0,'hasCameraAccess':False,'hasMicAccess':False,'hasLocationAccess':False},
      'vendorInfo': {'supportEmails':['support@slack.com'],'phoneNumbers':[],'socialLinks':[],'hasContactInfo':True,'socialLinkCount':1}
    },
    # 3. Blocked tool - snusbase
    {
      'meta': {'employeeId':'E003','employeeEmail':'charlie@corp.com','department':'IT','detectedAt':'2026-05-17T09:15:00'},
      'site': {'domain':'snusbase.com','url':'https://snusbase.com/login','isLoginPage':True,'https':True,'hasPasswordField':True,'hasPrivacyPolicy':False,'hasTerms':False,'hasCookieBanner':False},
      'dataFootprint': {'cookieCount':2,'trackingCookies':[],'trackingCookieCount':0,'localStorageCount':0,'sessionStorageCount':0},
      'permissions': {'requestedPermissions':[],'permissionCount':0,'hasCameraAccess':False,'hasMicAccess':False,'hasLocationAccess':False},
      'vendorInfo': {'supportEmails':[],'phoneNumbers':[],'socialLinks':[],'hasContactInfo':False,'socialLinkCount':0}
    },
    # 4. Unknown tool - random startup
    {
      'meta': {'employeeId':'E001','employeeEmail':'bob@corp.com','department':'Sales','detectedAt':'2026-05-16T14:20:00'},
      'site': {'domain':'cool-new-crm.io','url':'https://cool-new-crm.io/login','isLoginPage':True,'https':True,'hasPasswordField':True,'hasPrivacyPolicy':True,'hasTerms':False,'hasCookieBanner':False},
      'dataFootprint': {'cookieCount':15,'trackingCookies':['_ga','_fbp','mixpanel'],'trackingCookieCount':3,'localStorageCount':5,'sessionStorageCount':2},
      'permissions': {'requestedPermissions':[],'permissionCount':0,'hasCameraAccess':False,'hasMicAccess':False,'hasLocationAccess':False},
      'vendorInfo': {'supportEmails':['hello@cool-new-crm.io'],'phoneNumbers':[],'socialLinks':[],'hasContactInfo':True,'socialLinkCount':1}
    },
    # 5. Approved tool - github
    {
      'meta': {'employeeId':'E004','employeeEmail':'diana@corp.com','department':'Engineering','detectedAt':'2026-05-15T11:00:00'},
      'site': {'domain':'github.com','url':'https://github.com/login','isLoginPage':True,'https':True,'hasPasswordField':True,'hasPrivacyPolicy':True,'hasTerms':True,'hasCookieBanner':False},
      'dataFootprint': {'cookieCount':3,'trackingCookies':[],'trackingCookieCount':0,'localStorageCount':1,'sessionStorageCount':0},
      'permissions': {'requestedPermissions':[],'permissionCount':0,'hasCameraAccess':False,'hasMicAccess':False,'hasLocationAccess':False},
      'vendorInfo': {'supportEmails':[],'phoneNumbers':[],'socialLinks':[],'hasContactInfo':False,'socialLinkCount':0}
    },
    # 6. Blocked tool - anonfiles (HTTP)
    {
      'meta': {'employeeId':'E005','employeeEmail':'eve@corp.com','department':'Marketing','detectedAt':'2026-05-18T15:45:00'},
      'site': {'domain':'anonfiles.com','url':'http://anonfiles.com/login','isLoginPage':True,'https':False,'hasPasswordField':True,'hasPrivacyPolicy':False,'hasTerms':False,'hasCookieBanner':False},
      'dataFootprint': {'cookieCount':8,'trackingCookies':['tracker'],'trackingCookieCount':1,'localStorageCount':20,'sessionStorageCount':5},
      'permissions': {'requestedPermissions':[],'permissionCount':0,'hasCameraAccess':False,'hasMicAccess':False,'hasLocationAccess':False},
      'vendorInfo': {'supportEmails':[],'phoneNumbers':[],'socialLinks':[],'hasContactInfo':False,'socialLinkCount':0}
    }
]

print("Injecting sample data...")
for i, p in enumerate(payloads):
    try:
        resp = requests.post(API_URL, json=p)
        print(f"[{i+1}/{len(payloads)}] {p['site']['domain']} -> {resp.status_code}")
        time.sleep(0.5)
    except Exception as e:
        print(f"Error on {p['site']['domain']}: {e}")
print("Done!")
