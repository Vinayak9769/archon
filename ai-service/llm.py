import os
import json
from typing import Type, TypeVar, Optional, Union
from pydantic import BaseModel
from openai import OpenAI
from google import genai
from google.genai import types
import config

T = TypeVar('T', bound=BaseModel)

# Providers (identified by base_url substring) that do NOT support
# the OpenAI beta `json_schema` structured-output response format.
_PROVIDERS_WITHOUT_JSON_SCHEMA = [
    "groq.com",
    "together.ai",
    "fireworks.ai",
    "deepinfra.com",
    "anyscale.com",
]

def _supports_json_schema(base_url: Optional[str]) -> bool:
    """Return False if the base URL belongs to a provider that rejects json_schema."""
    if not base_url:
        return True  # vanilla OpenAI does support it
    for fragment in _PROVIDERS_WITHOUT_JSON_SCHEMA:
        if fragment in base_url:
            return False
    return True


def _simplify_schema(schema: dict) -> dict:
    """
    Recursively remove 'additionalProperties', 'strict', and other constraints
    that cause 400 errors on providers with limited structured-output support.
    """
    if not isinstance(schema, dict):
        return schema
    schema.pop("additionalProperties", None)
    schema.pop("strict", None)
    for key, value in schema.items():
        if isinstance(value, dict):
            schema[key] = _simplify_schema(value)
        elif isinstance(value, list):
            schema[key] = [_simplify_schema(v) if isinstance(v, dict) else v for v in value]
    return schema


class LLMClient:
    def __init__(self, provider: Optional[str] = None):
        self.provider = (provider or config.DEFAULT_PROVIDER).lower()
        
        # If requested provider's key is missing, fallback appropriately
        if self.provider == "openai" and not config.OPENAI_API_KEY:
            if config.GEMINI_API_KEY:
                print("\n[LLMClient] Warning: OPENAI_API_KEY is not set. Falling back to 'gemini'.\n")
                self.provider = "gemini"
            else:
                raise ValueError("OPENAI_API_KEY is not set, and GEMINI_API_KEY is also not set. Cannot initialize client.")
        
        elif self.provider == "gemini" and not config.GEMINI_API_KEY:
            if config.OPENAI_API_KEY:
                print("\n[LLMClient] Warning: GEMINI_API_KEY is not set. Falling back to 'openai'.\n")
                self.provider = "openai"
            else:
                raise ValueError("GEMINI_API_KEY is not set, and OPENAI_API_KEY is also not set. Cannot initialize client.")

        # Initialize the chosen provider
        if self.provider == "openai":
            openai_args = {"api_key": config.OPENAI_API_KEY}
            if config.OPENAI_BASE_URL:
                openai_args["base_url"] = config.OPENAI_BASE_URL
            self.openai_client = OpenAI(**openai_args)
            # Cache whether this endpoint supports json_schema structured outputs
            self._json_schema_supported = _supports_json_schema(config.OPENAI_BASE_URL)
        elif self.provider == "gemini":
            os.environ["GEMINI_API_KEY"] = config.GEMINI_API_KEY
            self.gemini_client = genai.Client()
        else:
            raise ValueError(f"Unknown LLM provider: {self.provider}")

    def _build_field_descriptions(self, schema: dict, defs: dict, depth: int = 0) -> str:
        """Recursively convert a JSON schema into a human-readable field list."""
        lines = []
        properties = schema.get("properties", {})
        required_fields = set(schema.get("required", []))

        for field_name, field_schema in properties.items():
            req = " (required)" if field_name in required_fields else " (optional)"

            # Resolve $ref
            if "$ref" in field_schema:
                ref_key = field_schema["$ref"].split("/")[-1]
                field_schema = defs.get(ref_key, field_schema)

            field_type = field_schema.get("type", "any")
            description = field_schema.get("description", "")
            prefix = "  " * depth

            if field_type == "object" or "properties" in field_schema:
                lines.append(f"{prefix}- \"{field_name}\"{req}: object — {description}")
                lines.append(self._build_field_descriptions(field_schema, defs, depth + 1))
            elif field_type == "array":
                items = field_schema.get("items", {})
                if "$ref" in items:
                    ref_key = items["$ref"].split("/")[-1]
                    items = defs.get(ref_key, items)
                item_type = items.get("type", "object")
                lines.append(f"{prefix}- \"{field_name}\"{req}: list of {item_type}s — {description}")
                if "properties" in items:
                    lines.append(self._build_field_descriptions(items, defs, depth + 1))
            else:
                enum_vals = field_schema.get("enum")
                if enum_vals:
                    lines.append(f"{prefix}- \"{field_name}\"{req}: {field_type}, one of {enum_vals} — {description}")
                else:
                    lines.append(f"{prefix}- \"{field_name}\"{req}: {field_type} — {description}")
        return "\n".join(lines)

    def _openai_json_fallback(
        self,
        model_name: str,
        messages: list,
        response_model: Type[T],
    ) -> T:
        """
        Generate structured output using plain json_object mode.
        Used for providers that don't support the beta json_schema format.
        """
        raw_schema = response_model.model_json_schema()
        defs = raw_schema.get("$defs", {})
        field_desc = self._build_field_descriptions(raw_schema, defs)
        model_name_str = response_model.__name__

        fallback_messages = list(messages)
        fallback_messages.append({
            "role": "user",
            "content": (
                f"Based on your analysis above, respond ONLY with a filled-in JSON object "
                f"(NOT a schema, NOT a template — real data values).\n\n"
                f"The JSON must be a `{model_name_str}` with these fields:\n"
                f"{field_desc}\n\n"
                "IMPORTANT RULES:\n"
                "- Return real values, not field descriptions or type definitions.\n"
                "- Use snake_case for all keys.\n"
                "- Do NOT wrap the JSON in markdown fences or code blocks.\n"
                "- Do NOT return the schema or field list as the response.\n"
                "- All required fields must have actual values."
            )
        })
        completion = self.openai_client.chat.completions.create(
            model=model_name,
            messages=fallback_messages,
            response_format={"type": "json_object"}
        )
        raw_text = completion.choices[0].message.content
        text = raw_text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```json") or lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        return response_model.model_validate_json(text)

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        response_model: Optional[Type[T]] = None,
        model: Optional[str] = None
    ) -> Union[str, T]:
        """
        Generate content using the selected provider.
        If response_model is provided, returns an instance of that Pydantic model.
        Otherwise, returns a raw string.
        """
        if self.provider == "openai":
            model_name = model or "llama-3.1-8b-instant"
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})

            if response_model:
                # Fast path: provider known to not support json_schema → skip directly to fallback
                if not self._json_schema_supported:
                    return self._openai_json_fallback(model_name, messages, response_model)

                # Standard path: try structured outputs first
                try:
                    completion = self.openai_client.beta.chat.completions.parse(
                        model=model_name,
                        messages=messages,
                        response_format=response_model,
                    )
                    parsed = completion.choices[0].message.parsed
                    if parsed is None:
                        raw_text = completion.choices[0].message.content
                        return response_model.model_validate_json(raw_text)
                    return parsed
                except Exception as e:
                    err_str = str(e)
                    if "json_schema" in err_str or "response_format" in err_str or "400" in err_str:
                        # Provider doesn't support json_schema — disable for all future calls
                        print(
                            f"\n[LLMClient] Provider does not support json_schema structured outputs. "
                            f"Switching to JSON fallback for all subsequent calls.\n"
                        )
                        self._json_schema_supported = False
                    else:
                        print(f"\n[LLMClient] beta.chat.completions.parse failed: {e}. Falling back to JSON generation.\n")
                    return self._openai_json_fallback(model_name, messages, response_model)
            else:
                completion = self.openai_client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                )
                return completion.choices[0].message.content

        elif self.provider == "gemini":
            model_name = model or "gemini-3.1-flash-lite"
            
            gen_config = {}
            if system_instruction:
                gen_config["system_instruction"] = system_instruction
            
            if response_model:
                gen_config["response_mime_type"] = "application/json"
                gen_config["response_schema"] = response_model

            config_obj = types.GenerateContentConfig(**gen_config)

            try:
                response = self.gemini_client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config_obj
                )
            except Exception as e:
                err_str = str(e)
                if response_model and "additionalProperties" in err_str:
                    # Gemini Developer API rejects additionalProperties:false that
                    # Pydantic v2 injects into every JSON schema. Fall back to
                    # plain JSON mode with field-description guidance.
                    print(
                        f"\n[LLMClient] Gemini schema error (additionalProperties). "
                        f"Falling back to JSON mode.\n"
                    )
                    return self._gemini_json_fallback(model_name, prompt, system_instruction, response_model)
                raise

            if response_model:
                text = response.text.strip()
                if text.startswith("```"):
                    lines = text.split("\n")
                    if lines[0].startswith("```json") or lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines[-1].startswith("```"):
                        lines = lines[:-1]
                    text = "\n".join(lines).strip()
                return response_model.model_validate_json(text)
            else:
                return response.text
        else:
            raise ValueError(f"Unknown LLM provider: {self.provider}")

    def _gemini_json_fallback(
        self,
        model_name: str,
        prompt: str,
        system_instruction: Optional[str],
        response_model: Type[T],
    ) -> T:
        """
        Fallback for Gemini when response_schema is rejected (e.g. additionalProperties error).
        Uses plain JSON mime type with field-description guidance appended to the prompt.
        """
        raw_schema = response_model.model_json_schema()
        defs = raw_schema.get("$defs", {})
        field_desc = self._build_field_descriptions(raw_schema, defs)
        model_name_str = response_model.__name__

        guided_prompt = (
            f"{prompt}\n\n"
            f"Based on your analysis above, respond ONLY with a filled-in JSON object "
            f"(NOT a schema, NOT a template — real data values).\n\n"
            f"The JSON must be a `{model_name_str}` with these fields:\n"
            f"{field_desc}\n\n"
            "IMPORTANT RULES:\n"
            "- Return real values, not field descriptions or type definitions.\n"
            "- Use snake_case for all keys.\n"
            "- Do NOT wrap the JSON in markdown fences or code blocks.\n"
            "- All required fields must have actual values."
        )

        gen_config = {"response_mime_type": "application/json"}
        if system_instruction:
            gen_config["system_instruction"] = system_instruction

        config_obj = types.GenerateContentConfig(**gen_config)
        response = self.gemini_client.models.generate_content(
            model=model_name,
            contents=guided_prompt,
            config=config_obj,
        )

        text = response.text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```json") or lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        return response_model.model_validate_json(text)
