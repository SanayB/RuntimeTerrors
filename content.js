// content.js

function getCompanyName() {
    let ogSiteName = document.querySelector('meta[property="og:site_name"]');
    if (ogSiteName && ogSiteName.content) {
        return ogSiteName.content;
    }
    return document.title.split('-')[0].split('|')[0].trim();
}

function hasPasswordField() {
    return document.querySelector('input[type="password"]') !== null;
}

function getFormAction() {
    let form = document.querySelector('form');
    if (form && form.action) {
        return form.action;
    }
    return null;
}

function checkLinksFor(keyword) {
    const links = Array.from(document.querySelectorAll('a'));
    return links.some(a => {
        const text = (a.innerText || "").toLowerCase();
        const href = (a.href || "").toLowerCase();
        return text.includes(keyword) || href.includes(keyword);
    });
}

function getEmails() {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const text = document.body.innerText;
    const matches = text.match(emailRegex) || [];
    const uniqueEmails = [...new Set(matches)];
    return uniqueEmails.filter(e => e.includes('support') || e.includes('contact') || e.includes('help') || e.includes('info'));
}

function getPhoneNumbers() {
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const text = document.body.innerText;
    const matches = text.match(phoneRegex) || [];
    return [...new Set(matches)];
}

function getSocialLinks() {
    const links = Array.from(document.querySelectorAll('a'));
    const socialDomains = ['linkedin.com', 'twitter.com', 'facebook.com', 'instagram.com', 'github.com'];
    let foundLinks = [];
    links.forEach(a => {
        if (a.href && socialDomains.some(domain => a.href.includes(domain))) {
            foundLinks.push(a.href);
        }
    });
    return [...new Set(foundLinks)];
}

async function getPermissions() {
    const permsToCheck = ['notifications', 'camera', 'microphone', 'geolocation'];
    let requested = [];
    for (let p of permsToCheck) {
        try {
            const status = await navigator.permissions.query({ name: p });
            if (status.state === 'granted' || status.state === 'prompt') requested.push(p);
        } catch (e) {}
    }
    return requested;
}

// NEW ADVANCED PHISHING FIELDS

function getSuspiciousKeywords() {
    const url = window.location.href.toLowerCase();
    const keywords = ['verify', 'secure-login', 'update-account', 'banking', 'login', 'signin', 'auth'];
    return keywords.filter(k => url.includes(k));
}

function hasFavicon() {
    return document.querySelector('link[rel="icon"], link[rel="shortcut icon"]') !== null;
}

function getMetaDescription() {
    const meta = document.querySelector('meta[name="description"]');
    return meta ? meta.content : null;
}

function getExternalScripts() {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const currentDomain = window.location.hostname;
    let thirdPartyDomains = [];
    
    scripts.forEach(s => {
        try {
            const url = new URL(s.src);
            if (!url.hostname.includes(currentDomain)) {
                thirdPartyDomains.push(url.hostname);
            }
        } catch(e) {}
    });
    
    return {
        count: scripts.length,
        domains: [...new Set(thirdPartyDomains)]
    };
}

function hasCaptcha() {
    const html = document.documentElement.innerHTML.toLowerCase();
    return html.includes('recaptcha') || html.includes('hcaptcha') || html.includes('turnstile');
}

function hasMixedContent() {
    if (window.location.protocol !== 'https:') return false;
    const elements = Array.from(document.querySelectorAll('img[src], script[src], iframe[src]'));
    return elements.some(el => el.src && el.src.startsWith('http:'));
}

function getLoginMethod() {
    const hasEmail = document.querySelector('input[type="email"]') !== null;
    const hasUsername = document.querySelector('input[type="text"][name*="user"], input[type="text"][id*="user"]') !== null;
    const hasPassword = document.querySelector('input[type="password"]') !== null;
    
    if (hasEmail && hasPassword) return "email-password";
    if (hasUsername && hasPassword) return "username-password";
    if (!hasPassword) return "oauth-only";
    return "unknown";
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract_signup_data") {
        (async () => {
            const scriptsData = getExternalScripts();
            const payload = {
                companyName: getCompanyName(),
                hasPasswordField: hasPasswordField(),
                formAction: getFormAction(),
                hasPrivacyPolicy: checkLinksFor('privacy'),
                hasTerms: checkLinksFor('terms'),
                requestedPermissions: await getPermissions(),
                localStorageCount: Object.keys(localStorage).length,
                sessionStorageCount: Object.keys(sessionStorage).length,
                supportEmails: getEmails(),
                phoneNumbers: getPhoneNumbers(),
                socialLinks: getSocialLinks(),
                // NEW FIELDS
                suspiciousKeywords: getSuspiciousKeywords(),
                urlLength: window.location.href.length,
                subdomainCount: window.location.hostname.split('.').length - 1,
                hasFavicon: hasFavicon(),
                metaDescription: getMetaDescription(),
                externalScriptCount: scriptsData.count,
                thirdPartyDomains: scriptsData.domains,
                hasCaptcha: hasCaptcha(),
                hasMixedContent: hasMixedContent(),
                loginMethod: getLoginMethod()
            };
            sendResponse(payload);
        })();
        return true; 
    }
});
