// utils.js

function getDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch (e) {
        return '';
    }
}

function isAiTool(domain, title) {
    const aiKeywords = ['ai', 'gpt', 'llm', 'assistant', 'chatgpt', 'claude', 'gemini'];
    const textToSearch = (domain + ' ' + title).toLowerCase();
    return aiKeywords.some(keyword => textToSearch.includes(keyword));
}

function categorizeWebsite(domain, isAi) {
    if (isAi) return "AI Tool";
    
    if (domain.includes("slack") || domain.includes("discord") || domain.includes("teams")) {
        return "Communication";
    }
    if (domain.includes("drive.google") || domain.includes("dropbox") || domain.includes("onedrive")) {
        return "Cloud Storage";
    }
    if (domain.includes("notion") || domain.includes("docs.google") || domain.includes("trello")) {
        return "Productivity";
    }
    if (domain.includes("canva") || domain.includes("figma") || domain.includes("adobe")) {
        return "Design";
    }
    if (domain.includes("github") || domain.includes("gitlab") || domain.includes("stackoverflow") || domain.includes("localhost")) {
        return "Development";
    }
    
    return "Unknown";
}
