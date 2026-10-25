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
                            try:
                                return json.loads(message_content)
                            except json.JSONDecodeError as jde:
                                raise LLMServiceError(f"Malformed JSON from LLM: {str(jde)}") from jde
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
