"""
models.py — M2 Risk Assessment Engine (Part A)
Defines the ExtensionPayload Pydantic v2 model used to validate
incoming JSON payloads sent by the browser extension.
"""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, ValidationError


# ---------------------------------------------------------------------------
# Sub-models — each maps to a nested group in the incoming JSON payload
# ---------------------------------------------------------------------------

class MetaInfo(BaseModel):
    """Employee and browser metadata attached to every captured event."""

    employeeId: str
    employeeEmail: str
    department: str
    detectedAt: str
    browserName: str = "Unknown"
    extensionVersion: str = "1.0.0"


class SiteInfo(BaseModel):
    """Information about the website the employee visited."""

    domain: str
    url: str
    companyName: str = ""
    isLoginPage: bool
    https: bool
    hasPasswordField: bool
    formAction: str = ""
    hasPrivacyPolicy: bool
    hasTerms: bool
    hasCookieBanner: bool
    suspiciousKeywords: List[str] = []
    urlLength: int = 0
    subdomainCount: int = 0
    hasFavicon: bool = False
    metaDescription: str = ""
    externalScriptCount: int = 0
    thirdPartyDomains: List[str] = []
    hasCaptcha: bool = False
    hasMixedContent: bool = False
    loginMethod: str = "unknown"


class DataFootprint(BaseModel):
    """Cookies, local storage, and tracking technology detected on the page."""

    cookieCount: int
    trackingCookies: List[str]
    trackingCookieCount: int
    localStorageCount: int
    sessionStorageCount: int
    externalScriptCount: int = 0
    thirdPartyDomains: List[str] = []


class PermissionsInfo(BaseModel):
    """Browser permissions requested by the site."""

    requestedPermissions: List[str]
    permissionCount: int
    hasCameraAccess: bool
    hasMicAccess: bool
    hasLocationAccess: bool


class VendorInfo(BaseModel):
    """Vendor contact details and social presence detected on the page."""

    supportEmails: List[str]
    phoneNumbers: List[str]
    socialLinks: List[str]
    hasContactInfo: bool
    socialLinkCount: int


# ---------------------------------------------------------------------------
# Top-level model
# ---------------------------------------------------------------------------

class ExtensionPayload(BaseModel):
    """
    Full payload sent by the Shadow IT browser extension.

    All five nested groups are required.  Optional leaf fields have defaults
    defined in their respective sub-models above.
    """

    meta: MetaInfo
    site: SiteInfo
    dataFootprint: DataFootprint
    permissions: PermissionsInfo
    vendorInfo: VendorInfo

    # -----------------------------------------------------------------------
    # Factory / parsing
    # -----------------------------------------------------------------------

    @classmethod
    def parse_payload(cls, raw: dict) -> "ExtensionPayload":
        """
        Validate and parse a raw dictionary into an ExtensionPayload instance.

        Wraps Pydantic's model_validate so that callers never need to import
        pydantic.ValidationError — a plain ValueError is raised instead, with
        a human-readable message that includes the first failing field path.

        Args:
            raw: The deserialized JSON dict from the browser extension request.

        Returns:
            A validated ExtensionPayload instance.

        Raises:
            ValueError: If one or more fields fail validation, with the
                        first offending field path included in the message.
        """
        try:
            return cls.model_validate(raw)
        except ValidationError as exc:
            # Pull out the first error's location for a clear error message.
            first_error = exc.errors()[0]
            field_path = " -> ".join(str(part) for part in first_error["loc"])
            raise ValueError(
                f"Payload validation failed at field '{field_path}': "
                f"{first_error['msg']}"
            ) from exc
