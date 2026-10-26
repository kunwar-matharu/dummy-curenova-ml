import re
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
import httpx
from ..config import settings

logger = logging.getLogger("curenova.llm_service")

# Regex pattern for basic PHI detection (email, phone, SSN patterns)
PHI_PATTERNS = [
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),  # Email
    re.compile(r"\b\d{3}[-.\s]??\d{2}[-.\s]??\d{4}\b"),  # SSN
    re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),  # Phone
]

PLACEHOLDER_KEYS = {
    "your_llm_api_key_here",
    "replace_with_a_secure_high_entropy_secret_min_32_chars",
    "sk-placeholder",
    "none",
    ""
}

def sanitize_and_deidentify(text: str) -> str:
    """
    Ensures text contains no personal health information (PHI) or contact identifiers.
    Redacts detected patterns and strips control characters.
    """
    if not text:
        return ""
    sanitized = text
    for pattern in PHI_PATTERNS:
        sanitized = pattern.sub("[REDACTED_IDENTIFIER]", sanitized)
    # Neutralize prompt injection delimiter attempts
    sanitized = sanitized.replace("<system>", "&lt;system&gt;").replace("</system>", "&lt;/system&gt;")
    sanitized = sanitized.replace("<instruction>", "&lt;instruction&gt;").replace("</instruction>", "&lt;/instruction&gt;")
    return sanitized.strip()


def extract_json_from_llm_text(text: str) -> Any:
    """
    Safely extracts and parses JSON payload from LLM responses.
    Handles raw JSON, markdown-wrapped blocks (```json ... ```),
    and outer-bracketed dictionaries.
    """
    if not text:
        raise LLMServiceError("Empty response content from LLM provider.")

    clean = text.strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass

    # Handle markdown code block fences
    if "```" in clean:
        lines = clean.splitlines()
        extracted = []
        inside_fence = False
        for line in lines:
            stripped_line = line.strip()
            if stripped_line.startswith("```"):
                inside_fence = not inside_fence
                continue
            if inside_fence:
                extracted.append(line)
        if extracted:
            try:
                return json.loads("\n".join(extracted).strip())
            except json.JSONDecodeError:
                pass

    # Extract outermost JSON object matching { ... }
    first_brace = clean.find("{")
    last_brace = clean.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = clean[first_brace:last_brace + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    raise LLMServiceError(f"Malformed JSON from LLM: unable to parse valid JSON from content: {clean[:200]}")


class LLMServiceError(Exception):
    """Base exception for LLM provider errors."""
    pass


class BaseLLMClient:
    async def chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1500,
        response_json: bool = True
    ) -> Dict[str, Any]:
        raise NotImplementedError


class OpenAILLMClient(BaseLLMClient):
    """
    OpenAI and OpenAI-compatible REST API client (supports vLLM, Ollama, DeepSeek, Groq).
    Uses httpx.AsyncClient with bounded retries, timeouts, and safe logging.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o-mini",
        timeout_seconds: float = 15.0,
        max_retries: int = 2
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries

    async def chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1500,
        response_json: bool = True
    ) -> Dict[str, Any]:
        endpoint = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Guard against unbounded prompt length
        clean_system = sanitize_and_deidentify(system_prompt)[:4000]
        clean_user = sanitize_and_deidentify(user_prompt)[:8000]

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": clean_system},
                {"role": "user", "content": clean_user}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        if response_json:
            payload["response_format"] = {"type": "json_object"}

        last_error = None
        for attempt in range(1, self.max_retries + 2):
            try:
                async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                    resp = await client.post(endpoint, json=payload, headers=headers)

                    if resp.status_code == 200:
                        data = resp.json()
                        choices = data.get("choices", [])
                        if not choices:
                            raise LLMServiceError("Provider returned empty choices array.")
                        message_content = choices[0].get("message", {}).get("content", "")

                        logger.info(
                            "LLM call succeeded: model=%s attempt=%d finish_reason=%s",
                            self.model, attempt, choices[0].get("finish_reason")
                        )

                        if response_json:
                            return extract_json_from_llm_text(message_content)
                        return {"content": message_content}

                    elif resp.status_code in (429, 500, 502, 503, 504):
                        # Transient retryable error
                        last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
                        logger.warning(
                            "LLM call transient failure: status=%d attempt=%d (retrying)",
                            resp.status_code, attempt
                        )
                        if attempt <= self.max_retries:
                            await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
                            continue
                    else:
                        # Non-retryable error (e.g. 400 Bad Request, 401 Unauthorized)
                        error_snippet = resp.text[:200]
                        logger.error("LLM call non-retryable error: status=%d", resp.status_code)
                        raise LLMServiceError(f"LLM Provider error {resp.status_code}: {error_snippet}")

            except httpx.TimeoutException as te:
                last_error = f"Timeout after {self.timeout_seconds}s"
                logger.warning("LLM call timed out on attempt %d: %s", attempt, str(te))
                if attempt <= self.max_retries:
                    await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
                    continue
            except httpx.RequestError as re:
                last_error = f"Network request error: {str(re)}"
                logger.warning("LLM network request error on attempt %d: %s", attempt, str(re))
                if attempt <= self.max_retries:
                    await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
                    continue

        raise LLMServiceError(f"LLM service unavailable after {self.max_retries + 1} attempts: {last_error}")


class MockLLMClient(BaseLLMClient):
    """
    Mock LLM client used for deterministic testing and synthetic benchmarks without live API keys.
    """
    def __init__(self, canned_response: Optional[Dict[str, Any]] = None):
        self.canned_response = canned_response or {}
        self.call_count = 0

    async def chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1500,
        response_json: bool = True
    ) -> Dict[str, Any]:
        self.call_count += 1
        return self.canned_response


def get_llm_client() -> Optional[BaseLLMClient]:
    """
    Returns an instantiated LLM client if configured and enabled, else None for fallback.
    Guarantees no raw keys are printed or logged.
    """
    if not settings.LLM_BACKEND_ENABLED:
        return None

    api_key = (settings.LLM_API_KEY or "").strip()
    if not api_key or api_key in PLACEHOLDER_KEYS:
        logger.info("LLM backend enabled but no valid LLM_API_KEY provided; falling back to deterministic.")
        return None

    provider = settings.LLM_PROVIDER.lower()
    if provider in ("openai", "openai_compatible", "generic"):
        return OpenAILLMClient(
            api_key=api_key,
            base_url=settings.LLM_BASE_URL,
            model=settings.LLM_MODEL,
            timeout_seconds=settings.LLM_TIMEOUT_SECONDS
        )
    elif provider == "mock":
        return MockLLMClient()
    else:
        logger.warning("Unrecognized LLM_PROVIDER '%s'; falling back to deterministic.", provider)
        return None


async def verify_gemini_connectivity() -> Dict[str, Any]:
    """
    Minimal, non-sensitive provider verification smoke test.
    Attempts a minimal test prompt to the configured Gemini endpoint.
    Guarantees no API keys or secrets are ever exposed in return values or logs.
    """
    client = get_llm_client()
    if not client:
        api_key = (settings.LLM_API_KEY or "").strip()
        if not settings.LLM_BACKEND_ENABLED:
            return {
                "status": "pending_unverified",
                "verified": False,
                "reason": "LLM_BACKEND_ENABLED is false; running in deterministic fallback mode",
                "model": settings.LLM_MODEL,
                "provider": settings.LLM_PROVIDER
            }
        if not api_key or api_key in PLACEHOLDER_KEYS:
            return {
                "status": "pending_unverified",
                "verified": False,
                "reason": "No valid LLM_API_KEY configured in environment (.env is absent or key is placeholder)",
                "model": settings.LLM_MODEL,
                "provider": settings.LLM_PROVIDER
            }
        return {
            "status": "pending_unverified",
            "verified": False,
            "reason": f"Provider '{settings.LLM_PROVIDER}' could not be initialized",
            "model": settings.LLM_MODEL,
            "provider": settings.LLM_PROVIDER
        }

    try:
        res = await client.chat_completion(
            system_prompt="You are CureNova health check probe. Return JSON: {\"status\": \"ok\"}.",
            user_prompt="ping",
            max_tokens=30,
            response_json=True
        )
        return {
            "status": "live_verified",
            "verified": True,
            "model": settings.LLM_MODEL,
            "provider": settings.LLM_PROVIDER,
            "response": res
        }
    except LLMServiceError as lse:
        return {
            "status": "failed",
            "verified": False,
            "model": settings.LLM_MODEL,
            "provider": settings.LLM_PROVIDER,
            "error": str(lse)
        }
    except Exception as e:
        return {
            "status": "failed",
            "verified": False,
            "model": settings.LLM_MODEL,
            "provider": settings.LLM_PROVIDER,
            "error": f"Unexpected error during live verification: {type(e).__name__}"
        }
